/**
 * BufLoader - Loads .buf geometry files (binary format used by the original site)
 * Format: 4-byte header size + JSON header + binary vertex data
 */

import * as THREE from 'three';

export class BufLoader {
  /**
   * Load a .buf file and return a BufferGeometry
   */
  async load(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load ${url}: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return this.parse(arrayBuffer);
    } catch (error) {
      console.error('BufLoader error:', error);
      // Return a fallback sphere geometry
      return new THREE.SphereGeometry(1, 32, 32);
    }
  }

  /**
   * Parse .buf binary format
   */
  parse(arrayBuffer) {
    // Read header size (first 4 bytes)
    const headerSize = new Uint32Array(arrayBuffer, 0, 1)[0];

    // Read JSON header
    const headerBytes = new Uint8Array(arrayBuffer, 4, headerSize);
    const headerText = String.fromCharCode.apply(null, headerBytes);
    const header = JSON.parse(headerText);

    const vertexCount = header.vertexCount;
    const indexCount = header.indexCount;

    // Create geometry
    const geometry = new THREE.BufferGeometry();

    // Starting position after header
    let offset = 4 + headerSize;

    // Parse attributes
    const attributes = header.attributes;
    const attributeOffsets = {};

    for (let i = 0; i < attributes.length; i++) {
      const attr = attributes[i];
      const attrId = attr.id;
      const count = attrId === 'indices' ? indexCount : vertexCount;
      const componentSize = attr.componentSize;
      const StorageType = window[attr.storageType]; // e.g., Float32Array, Uint16Array

      const byteLength = count * componentSize * StorageType.BYTES_PER_ELEMENT;
      const data = new StorageType(arrayBuffer, offset, count * componentSize);

      // Store offset for later if needed
      attributeOffsets[attrId] = offset;

      if (attrId === 'indices') {
        geometry.setIndex(new THREE.BufferAttribute(data, 1));
      } else {
        geometry.setAttribute(attrId, new THREE.BufferAttribute(data, componentSize));
      }

      offset += byteLength;
    }

    return geometry;
  }
}
