#!/usr/bin/env node

/**
 * 生成不同大小的测试 JSON 文件
 * 用于性能测试
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 生成指定大小的 JSON 对象
function generateJSON(targetSizeInMB) {
  const targetSize = targetSizeInMB * 1024 * 1024;

  // 生成嵌套的复杂 JSON 结构
  const data = {
    metadata: {
      version: '1.0.0',
      generated: new Date().toISOString(),
      targetSize: `${targetSizeInMB}MB`,
      description: '性能测试数据'
    },
    users: [],
    products: [],
    orders: [],
    analytics: {
      daily: [],
      monthly: []
    }
  };

  // 添加用户数据
  let currentSize = JSON.stringify(data).length;
  let userId = 1;

  while (currentSize < targetSize * 0.3) {
    data.users.push({
      id: userId++,
      name: `User ${userId}`,
      email: `user${userId}@example.com`,
      age: 20 + (userId % 50),
      address: {
        street: `${userId} Main Street`,
        city: 'City ' + (userId % 100),
        country: 'Country',
        zipCode: String(10000 + userId).padStart(5, '0')
      },
      preferences: {
        theme: userId % 2 === 0 ? 'dark' : 'light',
        language: 'en',
        notifications: {
          email: true,
          sms: userId % 3 === 0,
          push: true
        }
      },
      metadata: {
        createdAt: new Date(2020, 0, userId % 365).toISOString(),
        lastLogin: new Date().toISOString(),
        loginCount: userId * 10
      }
    });
    currentSize = JSON.stringify(data).length;
  }

  // 添加产品数据
  let productId = 1;
  while (currentSize < targetSize * 0.5) {
    data.products.push({
      id: productId++,
      name: `Product ${productId}`,
      sku: `SKU-${String(productId).padStart(6, '0')}`,
      price: (productId * 9.99).toFixed(2),
      category: ['Electronics', 'Clothing', 'Books', 'Food'][productId % 4],
      tags: [`tag${productId}`, `category${productId % 10}`, 'featured'],
      stock: productId * 100,
      description: `This is a detailed description of product ${productId}. `.repeat(5),
      specifications: {
        weight: `${productId * 0.5}kg`,
        dimensions: {
          width: productId % 100,
          height: productId % 50,
          depth: productId % 30
        },
        material: 'High quality materials',
        warranty: '2 years'
      },
      reviews: Array.from({ length: Math.min(5, productId % 10) }, (_, i) => ({
        rating: 3 + (i % 3),
        comment: `Review ${i + 1} for product ${productId}`,
        author: `User ${i + 1}`
      }))
    });
    currentSize = JSON.stringify(data).length;
  }

  // 添加订单数据
  let orderId = 1;
  while (currentSize < targetSize * 0.7) {
    data.orders.push({
      id: orderId++,
      userId: (orderId % 100) + 1,
      orderNumber: `ORD-${String(orderId).padStart(8, '0')}`,
      status: ['pending', 'processing', 'shipped', 'delivered'][orderId % 4],
      items: Array.from({ length: (orderId % 5) + 1 }, (_, i) => ({
        productId: (orderId * 10 + i) % 500,
        quantity: (i % 3) + 1,
        price: ((orderId + i) * 19.99).toFixed(2)
      })),
      total: (orderId * 99.99).toFixed(2),
      shipping: {
        method: ['standard', 'express', 'overnight'][orderId % 3],
        address: {
          street: `${orderId} Delivery Street`,
          city: 'City',
          country: 'Country',
          zipCode: String(20000 + orderId).padStart(5, '0')
        },
        trackingNumber: `TRK${String(orderId).padStart(10, '0')}`
      },
      payment: {
        method: ['credit_card', 'paypal', 'bank_transfer'][orderId % 3],
        status: 'completed',
        transactionId: `TXN${orderId}`
      },
      timestamps: {
        created: new Date(2024, 0, orderId % 365).toISOString(),
        updated: new Date().toISOString()
      }
    });
    currentSize = JSON.stringify(data).length;
  }

  // 添加分析数据填充到目标大小
  let dayId = 1;
  while (currentSize < targetSize * 0.95) {
    data.analytics.daily.push({
      date: new Date(2024, 0, dayId % 365).toISOString().split('T')[0],
      metrics: {
        visitors: 1000 + (dayId * 137) % 10000,
        pageViews: 5000 + (dayId * 239) % 50000,
        revenue: ((dayId * 1234.56) % 100000).toFixed(2),
        orders: 50 + (dayId * 7) % 500,
        conversionRate: ((dayId % 100) / 100).toFixed(4)
      },
      topPages: Array.from({ length: 10 }, (_, i) => ({
        url: `/page/${i + 1}`,
        views: 100 + (dayId * i * 17) % 1000
      }))
    });
    currentSize = JSON.stringify(data).length;
    dayId++;
  }

  return data;
}

// 生成测试文件
const testDir = path.join(__dirname, '..', 'test-data');

// 确保目录存在
if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir, { recursive: true });
}

console.log('正在生成测试 JSON 文件...\n');

// 生成不同大小的文件
[1, 3, 5].forEach(sizeMB => {
  console.log(`生成 ${sizeMB}MB JSON 文件...`);
  const startTime = Date.now();

  const data = generateJSON(sizeMB);
  const json = JSON.stringify(data, null, 2);

  const filePath = path.join(testDir, `test-${sizeMB}mb.json`);
  fs.writeFileSync(filePath, json);

  const actualSizeMB = (json.length / (1024 * 1024)).toFixed(2);
  const elapsed = Date.now() - startTime;

  console.log(`  ✓ 文件已生成: ${filePath}`);
  console.log(`    实际大小: ${actualSizeMB} MB`);
  console.log(`    耗时: ${elapsed}ms`);
  console.log(`    行数: ${json.split('\n').length}`);
  console.log('');
});

console.log('✅ 所有测试文件已生成完成!');
