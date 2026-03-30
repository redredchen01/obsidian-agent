import test from 'node:test';
import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { VaultRegistry } from '../src/vault-registry.mjs';

test('VaultRegistry', async (t) => {
  let tmpDir, registryPath, vaultPath1, vaultPath2;

  t.before(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'vault-registry-test-'));
    registryPath = join(tmpDir, 'vaults.json');
    vaultPath1 = join(tmpDir, 'vault1');
    vaultPath2 = join(tmpDir, 'vault2');
    mkdirSync(vaultPath1, { recursive: true });
    mkdirSync(vaultPath2, { recursive: true });
  });

  t.after(() => {
    try {
      rmSync(tmpDir, { recursive: true });
    } catch (err) {
      // ignore
    }
  });

  await t.test('load creates empty registry if file missing', async () => {
    const registry = new VaultRegistry(registryPath);
    await registry.load();
    assert.equal(registry.vaults.length, 0);
    assert.equal(registry.defaultVaultName, null);
  });

  await t.test('register adds vault and sets as default if first', async () => {
    const registry = new VaultRegistry(registryPath);
    await registry.load();
    await registry.register('team-kb', vaultPath1);
    assert.equal(registry.vaults.length, 1);
    assert.equal(registry.vaults[0].name, 'team-kb');
    assert.equal(registry.defaultVaultName, 'team-kb');
  });

  await t.test('register throws on duplicate name', async () => {
    const registry = new VaultRegistry(registryPath);
    await registry.load();
    await registry.register('personal', vaultPath1);
    await assert.rejects(
      () => registry.register('personal', vaultPath2),
      /Vault name already registered/
    );
  });

  await t.test('register throws on missing path', async () => {
    const registry = new VaultRegistry(registryPath);
    await registry.load();
    await assert.rejects(
      () => registry.register('invalid', join(tmpDir, 'nonexistent')),
      /Vault path does not exist/
    );
  });

  await t.test('setDefault updates default vault', async () => {
    const registry = new VaultRegistry(registryPath);
    await registry.load();
    await registry.register('vault-a', vaultPath1);
    await registry.register('vault-b', vaultPath2);
    assert.equal(registry.defaultVaultName, 'vault-a');
    await registry.setDefault('vault-b');
    assert.equal(registry.defaultVaultName, 'vault-b');
  });

  await t.test('setDefault throws on invalid vault', async () => {
    const registry = new VaultRegistry(registryPath);
    await registry.load();
    await registry.register('test', vaultPath1);
    await assert.rejects(
      () => registry.setDefault('nonexistent'),
      /Vault not found/
    );
  });

  await t.test('getByName returns vault or null', async () => {
    const registry = new VaultRegistry(registryPath);
    await registry.load();
    await registry.register('test-vault', vaultPath1);
    const vault = registry.getByName('test-vault');
    assert(vault);
    assert.equal(vault.name, 'test-vault');
    assert.equal(registry.getByName('nonexistent'), null);
  });

  await t.test('getDefault returns default vault or null', async () => {
    const registry = new VaultRegistry(registryPath);
    await registry.load();
    assert.equal(registry.getDefault(), null);
    await registry.register('default-test', vaultPath1);
    const vault = registry.getDefault();
    assert(vault);
    assert.equal(vault.name, 'default-test');
  });

  await t.test('list returns all vaults with default marker', async () => {
    const testRegistry = join(tmpDir, 'list-test.json');
    const registry = new VaultRegistry(testRegistry);
    await registry.load();
    await registry.register('vault1', vaultPath1);
    await registry.register('vault2', vaultPath2);
    const list = registry.list();
    assert.equal(list.length, 2);
    assert.equal(list.find(v => v.name === 'vault1').default, true);
    assert.equal(list.find(v => v.name === 'vault2').default, false);
  });

  await t.test('resolveVaultPath uses --vault flag precedence', async () => {
    const testRegistry = join(tmpDir, 'resolve-test.json');
    const registry = new VaultRegistry(testRegistry);
    await registry.load();
    await registry.register('team', vaultPath1);
    await registry.register('personal', vaultPath2);
    const resolved = registry.resolveVaultPath('personal');
    assert.equal(resolved, vaultPath2);
  });

  await t.test('resolveVaultPath throws on unknown vault', async () => {
    const registry = new VaultRegistry(registryPath);
    await registry.load();
    assert.throws(
      () => registry.resolveVaultPath('unknown'),
      /Vault not found/
    );
  });

  await t.test('resolveVaultPath falls back to OA_VAULT env', async () => {
    const originalOA = process.env.OA_VAULT;
    try {
      process.env.OA_VAULT = vaultPath1;
      const registry = new VaultRegistry(registryPath);
      await registry.load();
      const resolved = registry.resolveVaultPath();
      assert.equal(resolved, vaultPath1);
    } finally {
      if (originalOA) {
        process.env.OA_VAULT = originalOA;
      } else {
        delete process.env.OA_VAULT;
      }
    }
  });

  await t.test('resolveVaultPath falls back to registry default', async () => {
    const originalOA = process.env.OA_VAULT;
    try {
      delete process.env.OA_VAULT;
      const registry = new VaultRegistry(registryPath);
      await registry.load();
      await registry.register('default-vault', vaultPath1);
      const resolved = registry.resolveVaultPath();
      assert.equal(resolved, vaultPath1);
    } finally {
      if (originalOA) {
        process.env.OA_VAULT = originalOA;
      }
    }
  });

  await t.test('resolveVaultPath throws when no vault available', async () => {
    const originalOA = process.env.OA_VAULT;
    try {
      delete process.env.OA_VAULT;
      const newRegistryPath = join(tmpDir, 'vaults-empty.json');
      const registry = new VaultRegistry(newRegistryPath);
      await registry.load();
      assert.throws(
        () => registry.resolveVaultPath(),
        /No vault selected/
      );
    } finally {
      if (originalOA) {
        process.env.OA_VAULT = originalOA;
      }
    }
  });

  await t.test('save and load persist registry', async () => {
    const persistPath = join(tmpDir, 'vaults-persist.json');
    const registry1 = new VaultRegistry(persistPath);
    await registry1.load();
    await registry1.register('persist-test', vaultPath1);

    const registry2 = new VaultRegistry(persistPath);
    await registry2.load();
    assert.equal(registry2.vaults.length, 1);
    assert.equal(registry2.vaults[0].name, 'persist-test');
    assert.equal(registry2.defaultVaultName, 'persist-test');
  });

  await t.test('load handles corrupted registry gracefully', async () => {
    const corruptPath = join(tmpDir, 'vaults-corrupt.json');
    writeFileSync(corruptPath, '{ invalid json }');
    const registry = new VaultRegistry(corruptPath);
    await assert.rejects(
      () => registry.load(),
      /Failed to load vault registry/
    );
  });
});
