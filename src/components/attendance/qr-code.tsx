"use client";

import { useMemo } from "react";

const version = 8;
const size = 17 + version * 4;
const dataCodewords = 194;
const errorCodewordsPerBlock = 24;

export function QrCode({ value, label = "Session check-in QR code" }: { value: string; label?: string }) {
  const matrix = useMemo(() => encodeQr(value), [value]);
  const quiet = 4;
  const extent = size + quiet * 2;
  return (
    <svg aria-label={label} className="h-auto w-full bg-white" role="img" shapeRendering="crispEdges" viewBox={`0 0 ${extent} ${extent}`}>
      <rect fill="white" height={extent} width={extent} />
      {matrix.flatMap((row, rowIndex) => row.map((dark, columnIndex) => dark ? <rect fill="black" height="1" key={`${rowIndex}:${columnIndex}`} width="1" x={columnIndex + quiet} y={rowIndex + quiet} /> : null))}
    </svg>
  );
}

function encodeQr(value: string): boolean[][] {
  const bytes = Array.from(new TextEncoder().encode(value));
  if (bytes.length > 192) throw new Error("Check-in URL is too long for the local QR encoder.");
  const bits: number[] = [];
  appendBits(bits, 0b0100, 4);
  appendBits(bits, bytes.length, 8);
  bytes.forEach((byte) => appendBits(bits, byte, 8));
  const capacityBits = dataCodewords * 8;
  appendBits(bits, 0, Math.min(4, capacityBits - bits.length));
  while (bits.length % 8) bits.push(0);
  const words: number[] = [];
  for (let index = 0; index < bits.length; index += 8) {
    words.push(bits.slice(index, index + 8).reduce((word, bit) => (word << 1) | bit, 0));
  }
  for (let pad = 0; words.length < dataCodewords; pad += 1) words.push(pad % 2 === 0 ? 0xec : 0x11);

  const blocks = [words.slice(0, 97), words.slice(97, 194)];
  const parity = blocks.map((block) => reedSolomon(block, errorCodewordsPerBlock));
  const codewords: number[] = [];
  for (let index = 0; index < 97; index += 1) blocks.forEach((block) => codewords.push(block[index]));
  for (let index = 0; index < errorCodewordsPerBlock; index += 1) parity.forEach((block) => codewords.push(block[index]));

  const matrix: Array<Array<boolean | null>> = Array.from({ length: size }, () => Array<boolean | null>(size).fill(null));
  placeFinder(matrix, 0, 0);
  placeFinder(matrix, size - 7, 0);
  placeFinder(matrix, 0, size - 7);
  placeAlignmentPatterns(matrix);
  placeTiming(matrix);
  placeVersionInformation(matrix);
  placeFormatInformation(matrix, 0);
  placeData(matrix, codewords, 0);
  return matrix.map((row) => row.map((module) => module === true));
}

function appendBits(target: number[], value: number, length: number) {
  for (let shift = length - 1; shift >= 0; shift -= 1) target.push((value >>> shift) & 1);
}

function reedSolomon(data: number[], degree: number): number[] {
  let generator = [1];
  let root = 1;
  for (let index = 0; index < degree; index += 1) {
    generator = multiplyPolynomial(generator, [1, root]);
    root = multiplyField(root, 2);
  }
  const message = [...data, ...Array<number>(degree).fill(0)];
  for (let index = 0; index < data.length; index += 1) {
    const factor = message[index];
    if (!factor) continue;
    for (let offset = 0; offset < generator.length; offset += 1) message[index + offset] ^= multiplyField(generator[offset], factor);
  }
  return message.slice(data.length);
}

function multiplyPolynomial(left: number[], right: number[]): number[] {
  const result = Array<number>(left.length + right.length - 1).fill(0);
  left.forEach((leftValue, leftIndex) => right.forEach((rightValue, rightIndex) => {
    result[leftIndex + rightIndex] ^= multiplyField(leftValue, rightValue);
  }));
  return result;
}

function multiplyField(left: number, right: number): number {
  let result = 0;
  let multiplicand = left;
  let multiplier = right;
  while (multiplier) {
    if (multiplier & 1) result ^= multiplicand;
    multiplier >>>= 1;
    multiplicand <<= 1;
    if (multiplicand & 0x100) multiplicand ^= 0x11d;
  }
  return result;
}

function placeFinder(matrix: Array<Array<boolean | null>>, left: number, top: number) {
  for (let row = -1; row <= 7; row += 1) {
    for (let column = -1; column <= 7; column += 1) {
      const y = top + row;
      const x = left + column;
      if (y < 0 || y >= size || x < 0 || x >= size) continue;
      matrix[y][x] = row >= 0 && row <= 6 && column >= 0 && column <= 6 &&
        (row === 0 || row === 6 || column === 0 || column === 6 || (row >= 2 && row <= 4 && column >= 2 && column <= 4));
    }
  }
}

function placeAlignmentPatterns(matrix: Array<Array<boolean | null>>) {
  const positions = [6, 24, 42];
  positions.forEach((row) => positions.forEach((column) => {
    if (matrix[row][column] !== null) return;
    for (let y = -2; y <= 2; y += 1) {
      for (let x = -2; x <= 2; x += 1) matrix[row + y][column + x] = Math.max(Math.abs(x), Math.abs(y)) !== 1;
    }
  }));
}

function placeTiming(matrix: Array<Array<boolean | null>>) {
  for (let index = 8; index < size - 8; index += 1) {
    if (matrix[6][index] === null) matrix[6][index] = index % 2 === 0;
    if (matrix[index][6] === null) matrix[index][6] = index % 2 === 0;
  }
}

function placeVersionInformation(matrix: Array<Array<boolean | null>>) {
  const bits = bch(version, 0x1f25, 12);
  for (let index = 0; index < 18; index += 1) {
    const dark = ((bits >>> index) & 1) === 1;
    matrix[Math.floor(index / 3)][index % 3 + size - 11] = dark;
    matrix[index % 3 + size - 11][Math.floor(index / 3)] = dark;
  }
}

function placeFormatInformation(matrix: Array<Array<boolean | null>>, mask: number) {
  const errorCorrectionLevelL = 0b01;
  const bits = bch((errorCorrectionLevelL << 3) | mask, 0x537, 10) ^ 0x5412;
  for (let index = 0; index < 15; index += 1) {
    const dark = ((bits >>> index) & 1) === 1;
    if (index < 6) matrix[index][8] = dark;
    else if (index < 8) matrix[index + 1][8] = dark;
    else matrix[size - 15 + index][8] = dark;

    if (index < 8) matrix[8][size - index - 1] = dark;
    else if (index === 8) matrix[8][7] = dark;
    else matrix[8][15 - index - 1] = dark;
  }
  matrix[size - 8][8] = true;
}

function bch(value: number, polynomial: number, shift: number): number {
  let encoded = value << shift;
  const polynomialDegree = bitLength(polynomial);
  while (bitLength(encoded) >= polynomialDegree) encoded ^= polynomial << (bitLength(encoded) - polynomialDegree);
  return (value << shift) | encoded;
}

function bitLength(value: number): number {
  let length = 0;
  for (let current = value; current; current >>>= 1) length += 1;
  return length;
}

function placeData(matrix: Array<Array<boolean | null>>, codewords: number[], mask: number) {
  let byteIndex = 0;
  let bitIndex = 7;
  let row = size - 1;
  let direction = -1;
  for (let right = size - 1; right > 0; right -= 2) {
    if (right === 6) right -= 1;
    for (;;) {
      for (let offset = 0; offset < 2; offset += 1) {
        const column = right - offset;
        if (matrix[row][column] !== null) continue;
        let dark = byteIndex < codewords.length && ((codewords[byteIndex] >>> bitIndex) & 1) === 1;
        if (maskApplies(mask, row, column)) dark = !dark;
        matrix[row][column] = dark;
        bitIndex -= 1;
        if (bitIndex < 0) {
          byteIndex += 1;
          bitIndex = 7;
        }
      }
      row += direction;
      if (row >= 0 && row < size) continue;
      row -= direction;
      direction = -direction;
      break;
    }
  }
}

function maskApplies(mask: number, row: number, column: number): boolean {
  if (mask === 0) return (row + column) % 2 === 0;
  return false;
}

