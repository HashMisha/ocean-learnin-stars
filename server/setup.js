/*
 * Однократная настройка хранилищ: таблицы YDB (Document API) и CORS бакета Object Storage.
 * Запускает deploy.sh; вручную: DOCAPI_ENDPOINT=… BUCKET=… AWS_ACCESS_KEY_ID=… AWS_SECRET_ACCESS_KEY=… SITE_ORIGIN=… node setup.js
 */
'use strict';
const { DynamoDBClient, CreateTableCommand, ListTablesCommand } = require('@aws-sdk/client-dynamodb');
const { S3Client, PutBucketCorsCommand } = require('@aws-sdk/client-s3');

const E = process.env;
const TABLES = { ols_users: 'id', ols_materials: 'id', ols_events: 'id', ols_user_data: 'userId', ols_settings: 'key' };

(async () => {
  const ddb = new DynamoDBClient({ region: 'ru-central1', endpoint: E.DOCAPI_ENDPOINT });
  const existing = new Set(((await ddb.send(new ListTablesCommand({}))).TableNames) || []);
  for (const [name, key] of Object.entries(TABLES)) {
    if (existing.has(name)) { console.log('Таблица есть:', name); continue; }
    await ddb.send(new CreateTableCommand({
      TableName: name,
      AttributeDefinitions: [{ AttributeName: key, AttributeType: 'S' }],
      KeySchema: [{ AttributeName: key, KeyType: 'HASH' }],
      BillingMode: 'PAY_PER_REQUEST'
    }));
    console.log('Создана таблица:', name);
  }
  const s3 = new S3Client({ region: 'ru-central1', endpoint: 'https://storage.yandexcloud.net' });
  await s3.send(new PutBucketCorsCommand({
    Bucket: E.BUCKET,
    CORSConfiguration: { CORSRules: [{
      AllowedOrigins: E.SITE_ORIGIN.split(',').concat(['http://localhost:8080']),
      AllowedMethods: ['GET', 'PUT', 'HEAD'],
      AllowedHeaders: ['*'],
      MaxAgeSeconds: 3600
    }] }
  }));
  console.log('CORS бакета настроен для', E.SITE_ORIGIN);
})().catch((e) => { console.error('Ошибка настройки:', e.message); process.exit(1); });
