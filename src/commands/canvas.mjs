/**
 * JSON Canvas (.canvas) support — read/write Obsidian canvas files
 *
 * Implements the JSON Canvas spec (jsoncanvas.org).
 * Canvas files contain nodes (text, file, link, group) and edges.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';

function canvasPath(vaultRoot, name) {
  if (!name.endsWith('.canvas')) name += '.canvas';
  return resolve(vaultRoot, name);
}

function readCanvas(path) {
  if (!existsSync(path)) throw new Error(`Canvas not found: ${path}`);
  return JSON.parse(readFileSync(path, 'utf8'));
}

function writeCanvas(path, data) {
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
}

let _nextId = 0;
function genId() {
  return `node_${Date.now()}_${_nextId++}`;
}

/**
 * Create a new canvas file.
 */
export function canvasCreate(vaultRoot, name, { nodes = [], edges = [] } = {}) {
  if (!name) throw new Error('Usage: canvas create <name>');
  const path = canvasPath(vaultRoot, name);
  if (existsSync(path)) {
    console.log(`Canvas already exists: ${name}`);
    return { status: 'exists', file: name };
  }
  const data = { nodes, edges };
  writeCanvas(path, data);
  console.log(`Created canvas: ${name}`);
  return { status: 'created', file: name, nodes: nodes.length, edges: edges.length };
}

/**
 * Read and parse a canvas file.
 */
export function canvasRead(vaultRoot, name) {
  if (!name) throw new Error('Usage: canvas read <name>');
  const path = canvasPath(vaultRoot, name);
  const data = readCanvas(path);

  console.log(`Canvas: ${name}`);
  console.log(`  Nodes: ${data.nodes?.length || 0}`);
  console.log(`  Edges: ${data.edges?.length || 0}`);

  if (data.nodes?.length) {
    console.log('\nNodes:');
    for (const n of data.nodes) {
      const label = n.text?.slice(0, 40) || n.file || n.url || n.label || '(group)';
      console.log(`  [${n.type}] ${n.id}: ${label}`);
    }
  }
  if (data.edges?.length) {
    console.log('\nEdges:');
    for (const e of data.edges) {
      console.log(`  ${e.fromNode} → ${e.toNode}${e.label ? ` (${e.label})` : ''}`);
    }
  }

  return data;
}

/**
 * Add a node to an existing canvas.
 */
export function canvasAddNode(vaultRoot, name, { type = 'text', text, file, url, label, x = 0, y = 0, width = 250, height = 60, color } = {}) {
  if (!name) throw new Error('Usage: canvas add-node <name>');
  const path = canvasPath(vaultRoot, name);
  const data = existsSync(path) ? readCanvas(path) : { nodes: [], edges: [] };

  const node = { id: genId(), type, x, y, width, height };
  if (color) node.color = color;

  switch (type) {
    case 'text':
      node.text = text || '';
      break;
    case 'file':
      if (!file) throw new Error('file node requires --file parameter');
      node.file = file;
      break;
    case 'link':
      if (!url) throw new Error('link node requires --url parameter');
      node.url = url;
      break;
    case 'group':
      if (label) node.label = label;
      break;
    default:
      throw new Error(`Unknown node type: ${type}. Use text, file, link, or group`);
  }

  // Auto-layout: stack nodes vertically
  if (data.nodes.length > 0) {
    const maxY = Math.max(...data.nodes.map(n => n.y + n.height));
    node.y = maxY + 20;
  }

  data.nodes.push(node);
  writeCanvas(path, data);
  console.log(`Added ${type} node: ${node.id}`);
  return { status: 'added', nodeId: node.id, type };
}

/**
 * Add an edge between two nodes.
 */
export function canvasAddEdge(vaultRoot, name, { from, to, label, fromSide, toSide, color } = {}) {
  if (!name || !from || !to) throw new Error('Usage: canvas add-edge <name> --from <nodeId> --to <nodeId>');
  const path = canvasPath(vaultRoot, name);
  const data = readCanvas(path);

  const edge = { id: genId(), fromNode: from, toNode: to };
  if (label) edge.label = label;
  if (fromSide) edge.fromSide = fromSide;
  if (toSide) edge.toSide = toSide;
  if (color) edge.color = color;

  data.edges.push(edge);
  writeCanvas(path, data);
  console.log(`Added edge: ${from} → ${to}`);
  return { status: 'added', edgeId: edge.id, from, to };
}
