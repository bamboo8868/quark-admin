#!/usr/bin/env node

/**
 * Create Super Admin Script
 * 
 * Usage:
 *   node scripts/create-super-admin.js
 *   node scripts/create-super-admin.js --username admin --password admin123
 *   node scripts/create-super-admin.js --username admin --password admin123 --email admin@company.com
 * 
 * This script will:
 *   1. Check if the super admin role exists, create if not
 *   2. Check if the user exists, update password if yes, create if not
 *   3. Assign super admin role to the user
 *   4. Assign all menus to the super admin role
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import knex from 'knex';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--') && i + 1 < args.length) {
      const key = args[i].slice(2);
      options[key] = args[i + 1];
      i++;
    }
  }
  return options;
}

// Default values
const DEFAULTS = {
  username: 'admin',
  password: 'admin123',
  nickname: '超级管理员',
  email: 'admin@company.com',
  phone: '15888888888',
  role_name: '超级管理员',
  role_code: 'admin'
};

async function main() {
  const options = { ...DEFAULTS, ...parseArgs() };

  console.log('========================================');
  console.log('  Create Super Admin');
  console.log('========================================');
  console.log(`  Username: ${options.username}`);
  console.log(`  Password: ${options.password}`);
  console.log(`  Email:    ${options.email}`);
  console.log('========================================\n');

  // Initialize database connection
  const db = knex({
    client: process.env.DB_CLIENT || 'mysql2',
    connection: {
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      database: process.env.DB_NAME || 'zshop',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'root'
    }
  });

  try {
    // Test database connection
    await db.raw('SELECT 1');
    console.log('[✓] Database connection established\n');

    // Step 1: Ensure super admin role exists
    console.log('[1/4] Checking super admin role...');
    let adminRole = await db('roles').where({ code: options.role_code }).first();

    if (adminRole) {
      console.log(`[✓] Super admin role already exists (id: ${adminRole.id})`);
    } else {
      const [roleId] = await db('roles').insert({
        name: options.role_name,
        code: options.role_code,
        status: 1,
        remark: '超级管理员拥有最高权限',
        created_at: new Date(),
        updated_at: new Date()
      });
      adminRole = await db('roles').where({ id: roleId }).first();
      console.log(`[✓] Super admin role created (id: ${adminRole.id})`);
    }

    // Step 2: Check if user exists, create or update
    console.log('\n[2/4] Checking admin user...');
    let user = await db('users').where({ username: options.username }).first();
    const hashedPassword = await bcrypt.hash(options.password, 10);

    if (user) {
      // Update existing user
      await db('users').where({ id: user.id }).update({
        password: hashedPassword,
        status: 1,
        updated_at: new Date()
      });
      user = await db('users').where({ id: user.id }).first();
      console.log(`[✓] Admin user already exists, password updated (id: ${user.id})`);
    } else {
      // Create new user
      const [userId] = await db('users').insert({
        username: options.username,
        nickname: options.nickname,
        email: options.email,
        phone: options.phone,
        avatar: '',
        password: hashedPassword,
        sex: 0,
        status: 1,
        dept_id: 0,
        remark: '超级管理员',
        created_at: new Date(),
        updated_at: new Date()
      });
      user = await db('users').where({ id: userId }).first();
      console.log(`[✓] Admin user created (id: ${user.id})`);
    }

    // Step 3: Assign super admin role to user
    console.log('\n[3/4] Assigning super admin role...');
    const existingMapping = await db('user_roles')
      .where({ user_id: user.id, role_id: adminRole.id })
      .first();

    if (existingMapping) {
      console.log('[✓] User already has super admin role');
    } else {
      // Remove existing roles and assign super admin role
      await db('user_roles').where({ user_id: user.id }).del();
      await db('user_roles').insert({
        user_id: user.id,
        role_id: adminRole.id,
        created_at: new Date()
      });
      console.log('[✓] Super admin role assigned to user');
    }

    // Step 4: Assign all menus to super admin role
    console.log('\n[4/4] Assigning all menus to super admin role...');
    const allMenus = await db('menus').select('id');
    const menuIds = allMenus.map(m => m.id);

    // Delete existing role menus for this role
    await db('role_menus').where({ role_id: adminRole.id }).del();

    // Insert all menu mappings
    if (menuIds.length > 0) {
      const inserts = menuIds.map(menuId => ({
        role_id: adminRole.id,
        menu_id: menuId,
        created_at: new Date()
      }));
      await db('role_menus').insert(inserts);
      console.log(`[✓] Assigned ${menuIds.length} menus to super admin role`);
    } else {
      console.log('[!] No menus found in database. Run seed first: npm run seed');
    }

    console.log('\n========================================');
    console.log('  Super Admin Created Successfully!');
    console.log('========================================');
    console.log(`  Username: ${options.username}`);
    console.log(`  Password: ${options.password}`);
    console.log(`  Role:     ${options.role_name} (${options.role_code})`);
    console.log(`  Menus:    ${menuIds.length}`);
    console.log('========================================\n');

  } catch (error) {
    console.error('\n[✗] Error:', error.message);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

main();
