#!/usr/bin/env bash
# Развёртывание сервера Ocean learnin' stars в Yandex Cloud.
# Нужны: установленный и настроенный yc (yc init), Node.js 22+.
# Запуск из папки server:  bash deploy.sh ВАШ_ЛОГИН_ЯНДЕКС_ID
# Скрипт можно запускать повторно — он обновит функцию и ничего не создаст дважды.
set -euo pipefail
cd "$(dirname "$0")"

ADMIN_LOGIN="${1:?Укажите логин Яндекс ID администратора: bash deploy.sh ваш_логин}"
SITE_ORIGIN="${SITE_ORIGIN:-https://hashmisha.github.io}"
STATE=.deploy-state.json
[ -f "$STATE" ] || echo '{}' > "$STATE"
st() { node -e "const s=require('./$STATE');process.stdout.write(String(s['$1']||''))"; }
st_set() { node -e "const f='./$STATE',fs=require('fs'),s=JSON.parse(fs.readFileSync(f));s['$1']=process.argv[1];fs.writeFileSync(f,JSON.stringify(s,null,2))" "$2"; }
json() { node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const o=JSON.parse(d);process.stdout.write(String($1))})"; }

FOLDER_ID=$(yc config get folder-id)
echo "Каталог: $FOLDER_ID"

# 1. Сервисный аккаунт и роли
SA_ID=$(yc iam service-account get ols-api --format json 2>/dev/null | json 'o.id' || true)
if [ -z "$SA_ID" ]; then
  SA_ID=$(yc iam service-account create --name ols-api --description "API Ocean learnin' stars" --format json | json 'o.id')
fi
for ROLE in ydb.editor storage.editor ai.vision.user ai.languageModels.user functions.functionInvoker; do
  yc resource-manager folder add-access-binding "$FOLDER_ID" --role "$ROLE" --subject "serviceAccount:$SA_ID" >/dev/null 2>&1 || true
done
echo "Сервисный аккаунт: $SA_ID"

# 2. Статический ключ для YDB Document API и Object Storage
if [ -z "$(st key_id)" ]; then
  KEY_JSON=$(yc iam access-key create --service-account-id "$SA_ID" --format json)
  st_set key_id "$(echo "$KEY_JSON" | json 'o.access_key.key_id')"
  st_set key_secret "$(echo "$KEY_JSON" | json 'o.secret')"
fi
[ -n "$(st jwt)" ] || st_set jwt "$(node -e "process.stdout.write(require('crypto').randomBytes(32).toString('hex'))")"

# 3. База YDB Serverless
DB_JSON=$(yc ydb database get ols --format json 2>/dev/null || yc ydb database create --name ols --serverless --format json)
for i in $(seq 1 60); do
  STATUS=$(yc ydb database get ols --format json | json 'o.status')
  [ "$STATUS" = "RUNNING" ] && break
  echo "Ждём запуска базы… ($STATUS)"; sleep 5
done
DOCAPI=$(yc ydb database get ols --format json | json 'o.document_api_endpoint')
echo "YDB Document API: $DOCAPI"

# 4. Бакет для файлов (закрытый)
BUCKET="ols-materials-$FOLDER_ID"
yc storage bucket get "$BUCKET" >/dev/null 2>&1 || yc storage bucket create --name "$BUCKET" >/dev/null
echo "Бакет: $BUCKET"

# 5. Таблицы и CORS
[ -d node_modules ] || npm install --no-audit --no-fund --silent
DOCAPI_ENDPOINT="$DOCAPI" BUCKET="$BUCKET" AWS_ACCESS_KEY_ID="$(st key_id)" AWS_SECRET_ACCESS_KEY="$(st key_secret)" SITE_ORIGIN="$SITE_ORIGIN" node setup.js

# 6. Функция
rm -rf build && mkdir build && cp index.js package.json build/
yc serverless function get ols-api >/dev/null 2>&1 || yc serverless function create --name ols-api >/dev/null
yc serverless function version create \
  --function-name ols-api --runtime nodejs22 --entrypoint index.handler \
  --memory 256m --execution-timeout 60s --source-path build \
  --service-account-id "$SA_ID" \
  --environment "DOCAPI_ENDPOINT=$DOCAPI,BUCKET=$BUCKET,AWS_ACCESS_KEY_ID=$(st key_id),AWS_SECRET_ACCESS_KEY=$(st key_secret),JWT_SECRET=$(st jwt),ADMIN_LOGINS=$ADMIN_LOGIN,SITE_ORIGIN=$SITE_ORIGIN,YC_FOLDER_ID=$FOLDER_ID,TRUST_AFTER=3" >/dev/null
FN_ID=$(yc serverless function get ols-api --format json | json 'o.id')
rm -rf build
echo "Функция: $FN_ID"

# 7. API Gateway
cat > .gateway.yaml <<EOF
openapi: 3.0.0
info: { title: ols-api, version: 1.0.0 }
paths:
  /api/{proxy+}:
    x-yc-apigateway-any-method:
      parameters:
        - name: proxy
          in: path
          required: true
          schema: { type: string }
      x-yc-apigateway-integration:
        type: cloud_functions
        function_id: $FN_ID
        service_account_id: $SA_ID
EOF
if yc serverless api-gateway get ols-api >/dev/null 2>&1; then
  yc serverless api-gateway update ols-api --spec=.gateway.yaml >/dev/null
else
  yc serverless api-gateway create --name ols-api --spec=.gateway.yaml >/dev/null
fi
DOMAIN=$(yc serverless api-gateway get ols-api --format json | json 'o.domain')
API="https://$DOMAIN/api"
st_set api "$API"

# 8. Адрес API — в настройки сайта
node -e "const fs=require('fs'),f='../assets/js/core/config.js';let t=fs.readFileSync(f,'utf8');t=t.replace(/api: \{ base: '[^']*'/,\"api: { base: '$API'\");fs.writeFileSync(f,t)"
echo
echo "Готово. API: $API"
echo "Проверка: curl $API/health"
