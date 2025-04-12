// src/Utils.ts
import { TimeOfDay } from "@minecraft/server";
var Utils = class _Utils {
  static {
    this.dimensionsID = {
      "minecraft:overworld": 0,
      "minecraft:nether": 1,
      "minecraft:the_end": 2
    };
  }
  static genKey(dim, x, z) {
    return `${dim}/${x}/${z}`;
  }
  static getDirection(angle) {
    if (angle < 0) angle = 360 - Math.abs(angle);
    if (337.5 <= angle || angle < 22.5) return "ss";
    if (22.5 <= angle && angle < 67.5) return "sw";
    if (67.5 <= angle && angle < 112.5) return "ww";
    if (112.5 <= angle && angle < 157.5) return "nw";
    if (157.5 <= angle && angle < 202.5) return "nn";
    if (202.5 <= angle && angle < 247.5) return "ne";
    if (247.5 <= angle && angle < 292.5) return "ee";
    if (292.5 <= angle && angle < 337.5) return "se";
  }
  static getTimeTint(time) {
    let color1 = _Utils.buildRGB(0, 0, 0);
    let color2 = _Utils.buildRGB(0, 0, 0);
    const Day = _Utils.buildRGB(4, 4, 4);
    const Noon = _Utils.buildRGB(10, 10, 10);
    const Sunrise = _Utils.buildRGB(20, 20, 20);
    const Sunset = _Utils.buildRGB(20, 20, 10);
    const Night = _Utils.buildRGB(25, 25, 25);
    const Midnight = _Utils.buildRGB(70, 70, 70);
    if (time >= 0 && time <= TimeOfDay.Day) {
      color1 = Sunrise;
      color2 = Day;
    } else if (time >= TimeOfDay.Day && time <= TimeOfDay.Noon) {
      color1 = Sunset;
      color2 = Noon;
    } else if (time >= TimeOfDay.Noon && time <= TimeOfDay.Sunset) {
      color1 = Noon;
      color2 = Sunset;
    } else if (time >= TimeOfDay.Sunset && time <= TimeOfDay.Night) {
      color1 = Sunset;
      color2 = Night;
    } else if (time >= TimeOfDay.Night && time <= TimeOfDay.Midnight) {
      color1 = Night;
      color2 = Midnight;
    } else if (time >= TimeOfDay.Midnight && time < 24e3) {
      color1 = Midnight;
      color2 = Sunrise;
    }
    const mixColor = _Utils.lerpColor(color1, color2, time);
    return mixColor;
  }
  static lerpColor(color1, color2, time) {
    const factor = time / 48e3;
    return {
      r: Math.round(color1.r + (color2.r - color1.r) * factor),
      g: Math.round(color1.g + (color2.g - color1.g) * factor),
      b: Math.round(color1.b + (color2.b - color1.b) * factor),
      a: 1
    };
  }
  static buildRGB(r, g, b, a = 1) {
    return { r, g, b, a };
  }
};

// src/data.ts
import { world } from "@minecraft/server";

// src/classes/ColorPalette.ts
var ColorPalette = class {
  constructor(PALETTE_SIZE) {
    this.kdTree = this.generatePalette(PALETTE_SIZE);
  }
  generatePalette(size) {
    let levels = Math.cbrt(size);
    let colors = [];
    for (let r = 0; r < levels; r++) {
      for (let g = 0; g < levels; g++) {
        for (let b = 0; b < levels; b++) {
          colors.push({
            r: Math.round(r / (levels - 1) * 255),
            g: Math.round(g / (levels - 1) * 255),
            b: Math.round(b / (levels - 1) * 255),
            index: colors.length
          });
        }
      }
    }
    colors.sort((a, b) => a.r - b.r || a.g - b.g || a.b - b.b);
    return this.buildKDTree(colors, 0);
  }
  buildKDTree(points, depth) {
    if (points.length === 0) return null;
    let axis = depth % 3;
    let sortedPoints = [...points].sort((a, b) => a[["r", "g", "b"][axis]] - b[["r", "g", "b"][axis]]);
    let median = Math.floor(sortedPoints.length / 2);
    return {
      point: sortedPoints[median],
      left: this.buildKDTree(sortedPoints.slice(0, median), depth + 1),
      right: this.buildKDTree(sortedPoints.slice(median + 1), depth + 1)
    };
  }
  nearestNeighbor(tree, target, depth = 0, best = null) {
    if (!tree) return best;
    let axis = depth % 3;
    let diff = target[["r", "g", "b"][axis]] - tree.point[["r", "g", "b"][axis]];
    let nextBranch = diff < 0 ? tree.left : tree.right;
    let otherBranch = diff < 0 ? tree.right : tree.left;
    best = this.nearestNeighbor(nextBranch, target, depth + 1, best);
    let distance = this.colorDistance(tree.point, target);
    if (!best || distance < this.colorDistance(best, target)) {
      best = tree.point;
    }
    if (Math.abs(diff) < this.colorDistance(best, target)) {
      best = this.nearestNeighbor(otherBranch, target, depth + 1, best);
    }
    return best;
  }
  colorDistance(c1, c2) {
    return Math.sqrt(
      Math.pow(c1.r - c2.r, 2) + Math.pow(c1.g - c2.g, 2) + Math.pow(c1.b - c2.b, 2)
    );
  }
  getColorIndex({ r, g, b }) {
    let closest = this.nearestNeighbor(this.kdTree, { r, g, b }).index;
    return closest;
  }
  getGlyph(paletteIndex) {
    const glyphIndex = Math.floor(paletteIndex / 256) + 226;
    const positionInGlyph = paletteIndex % 256;
    const glyphFile = glyphIndex.toString(16).toUpperCase();
    const position = positionInGlyph.toString(16).padStart(2, "0").toUpperCase();
    const hexValue = `${glyphFile}${position}`;
    const hexCode = parseInt(hexValue, 16);
    return String.fromCharCode(hexCode);
  }
  getGlyphFromRGB({ r, g, b }) {
    let paletteIndex = this.nearestNeighbor(this.kdTree, { r, g, b }).index;
    const glyphIndex = Math.floor(paletteIndex / 256) + 226;
    const positionInGlyph = paletteIndex % 256;
    const glyphFile = glyphIndex.toString(16).toUpperCase();
    const position = positionInGlyph.toString(16).padStart(2, "0").toUpperCase();
    const hexValue = `${glyphFile}${position}`;
    const hexCode = parseInt(hexValue, 16);
    return String.fromCharCode(hexCode);
  }
  static FTI_RGBA(rgba) {
    return {
      red: rgba.red * 255,
      green: rgba.green * 255,
      blue: rgba.blue * 255,
      alpha: rgba.alpha * 255
    };
  }
  static BTT_RGBA(rgba) {
    return { r: rgba.red, g: rgba.green, b: rgba.blue, a: rgba.alpha };
  }
};

// src/data.ts
var ColorManager = new ColorPalette(4096);
var GlobalCache = /* @__PURE__ */ new Map();
var GlyphsCache = /* @__PURE__ */ new Map();
var ChunksCache = /* @__PURE__ */ new Set();
let Dimensions = undefined;

world.afterEvents.worldLoad.subscribe(() => {
  Dimensions= ["overworld", "nether", "the_end"].map((dim) => world.getDimension(dim));
});

var PreBuildColors = {
  Lava: Utils.buildRGB(220, 67, 20),
  Piston: Utils.buildRGB(201, 169, 118),
  Observer: Utils.buildRGB(206, 203, 198),
  Purpur: Utils.buildRGB(170, 92, 170),
  Basalt: Utils.buildRGB(76, 76, 76),
  Blackstone: Utils.buildRGB(44, 44, 44),
  Obsidian: Utils.buildRGB(61, 53, 75),
  Dripstone: Utils.buildRGB(181, 163, 140)
};
var VoidGlyph = ColorManager.getGlyphFromRGB(Utils.buildRGB(0, 0, 0, 0));

// src/classes/BlockColor.ts
var BlockColorBuilder = class {
  constructor(blockMap) {
    this.color = blockMap ? blockMap.color : { r: 0, g: 0, b: 0, a: 1 };
    this.blockMap = blockMap || null;
    if (blockMap) {
      const id = blockMap.typeId;
      if (id.includes("purpur")) this.color = PreBuildColors.Purpur;
      else if (id.includes("piston")) this.color = PreBuildColors.Piston;
      else if (id.includes("observer")) this.color = PreBuildColors.Observer;
      else if (id.includes("basalt")) this.color = PreBuildColors.Basalt;
      else if (id.includes("blackstone")) this.color = PreBuildColors.Blackstone;
      else if (id.includes("obsidian")) this.color = PreBuildColors.Obsidian;
      else if (id.includes("dripstone")) this.color = PreBuildColors.Dripstone;
      else if (id.includes("pink_petals")) this.color = PreBuildColors.Lava;
    }
  }
  // Water filter method
  setWaterFilter(rgba) {
    this.color = {
      r: Math.round(this.color.r * 0.7),
      g: Math.round(this.color.g * 0.7),
      b: Math.round(Math.min(255, this.color.b + rgba.b * 0.5)),
      a: this.color.a
    };
    return this;
  }
  // Time-Based Color method
  setTimeFilter(time) {
    const timeTint = Utils.getTimeTint(time);
    this.color = {
      r: Math.round(Math.max(0, this.color.r - timeTint.r * 0.5)),
      g: Math.round(Math.max(0, this.color.g - timeTint.g * 0.5)),
      b: Math.round(Math.max(0, this.color.b - timeTint.b * 0.5)),
      a: this.color.a
    };
    return this;
  }
};

// src/classes/BlockMap.ts
var BlockMapBuilder = class {
  constructor(block) {
    this.typeId = block.typeId;
    this.height = block.location.y;
    this.dim = block.dimension.id;
    this.isWaterlogged = block.isWaterlogged;
    this.location = block.location;
    let rawColor = block.getMapColor();
    const intColor = ColorPalette.FTI_RGBA(rawColor);
    this.color = ColorPalette.BTT_RGBA(intColor);
  }
};

// src/api/SystemEvents.ts
import { system, world as world2 } from "@minecraft/server";

// src/classes/PlayerMap.ts
var PlayerMap = class {
  constructor(player) {
    this.player = player;
    this.location = player.location;
    this.dimension = Utils.dimensionsID[player.dimension.id];
    this.bounds = { min: 0, max: 0, avg: 0, blocks: 0, blocksPerHeight: {} };
  }
  getBlockAssets(range = 15) {
    const assets = [];
    const x = Math.floor(this.location.x);
    const z = Math.floor(this.location.z);
    for (let xr = x - range; xr <= x + range; xr++) {
      let rowAssets = [];
      for (let zr = z - range; zr <= z + range; zr++) {
        const asset = { x: xr, z: zr, d: this.dimension };
        rowAssets.push(asset);
      }
      assets.push(rowAssets);
    }
    return this.rortateMatrix(assets);
  }
  getBounds(blocks) {
    const heightSet = /* @__PURE__ */ new Set();
    const blocksPerHeight = {};
    blocks.flat().forEach((b) => {
      heightSet.add(b ? b.height : 0);
      if (b && !blocksPerHeight[b.height]) blocksPerHeight[b.height] = 1;
      else if (b) blocksPerHeight[b.height] += 1;
    });
    const heightArray = [...heightSet];
    const min = Math.min(...heightArray);
    const max = Math.max(...heightArray);
    const avg = (min + max) / 2;
    const blocksAmount = heightArray.length;
    return { min, max, avg, blocks: blocksAmount, blocksPerHeight };
  }
  rortateMatrix(matrix) {
    const size = matrix.length;
    let rotated = Array.from({ length: size }, () => Array(size));
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        rotated[j][size - 1 - i] = matrix[i][j];
      }
    }
    return rotated;
  }
};

// src/classes/ChunkMap.ts
var ChunkMapBuilder = class {
  constructor(x, z) {
    const minX = Math.floor(x / 16) * 16;
    const minZ = Math.floor(z / 16) * 16;
    this.min = { x: minX, z: minZ };
    this.max = { x: minX + 15, z: minZ + 15 };
    this.world = { x: Math.floor(minX / 16), z: Math.floor(minZ / 16) };
  }
  split() {
    const { x: x1, z: z1 } = this.min;
    return [
      this.buildSubChunk(x1, x1 + 7, z1, z1 + 7),
      // Left-Up
      this.buildSubChunk(x1, x1 + 7, z1 + 8, z1 + 15),
      // Left-Down
      this.buildSubChunk(x1 + 8, x1 + 15, z1, z1 + 7),
      // Right-Up
      this.buildSubChunk(x1 + 8, x1 + 15, z1 + 8, z1 + 15)
      // Right-Down
    ];
  }
  buildSubChunk(x1, x2, z1, z2) {
    return { x1, x2, z1, z2 };
  }
};

// src/classes/WorldMap.ts
var WorldMapBuilder = class {
  constructor(location, range = 1) {
    this.location = location;
    const x = location.x;
    const z = location.z;
    const chunks = [];
    for (let xr = -range; xr <= range; xr++) {
      for (let zr = -range; zr <= range; zr++) {
        const rx = Math.floor((x + xr * 16) / 16) * 16;
        const rz = Math.floor((z + zr * 16) / 16) * 16;
        const chunk = new ChunkMapBuilder(rx, rz);
        chunks.push(chunk);
      }
    }
    this.chunks = chunks;
  }
};

// src/classes/TreeEngine.ts
import { BlockVolume } from "@minecraft/server";
var TreeEngine = class {
  constructor(block) {
    this.range = 3;
    this.leaves = /* @__PURE__ */ new Map();
    if (block.permutation.getState("pillar_axis") === "x") return;
    this.mergeLeaves(this.getLeaves("oak_leaves", block), "oak_leaves");
    this.mergeLeaves(this.getLeaves("spruce_leaves", block), "spruce_leaves");
    this.mergeLeaves(this.getLeaves("birch_leaves", block), "birch_leaves");
    this.mergeLeaves(this.getLeaves("acacia_leaves", block), "acacia_leaves");
    this.mergeLeaves(this.getLeaves("dark_oak_leaves", block), "dark_oak_leaves");
    this.mergeLeaves(this.getLeaves("mangrove_leaves", block), "mangrove_leaves");
    this.mergeLeaves(this.getLeaves("pale_oak_leaves", block), "pale_oak_leaves");
    this.mergeLeaves(this.getLeaves("cherry_leaves", block), "cherry_leaves");
    this.mergeLeaves(this.getLeaves("jungle_leaves", block), "jungle_leaves");
    this.mergeLeaves(this.getLeaves("azalea_leaves", block), "azalea_leaves");
    this.mergeLeaves(this.getLeaves("azalea_leaves_flowered", block), "azalea_leaves_flowered");
  }
  getLeaves(id, block) {
    const { x, y, z } = block.location;
    const d = Utils.dimensionsID[block.dimension.id];
    const vol = new BlockVolume(
      { x: x - (this.range + 1), y: y - 1, z: z - (this.range + 1) },
      { x: x + (this.range + 1), y: y + (this.range - 1), z: z + (this.range + 1) }
    );
    const nearbyBlocks = block.dimension.getBlocks(vol, { includeTypes: [`minecraft:${id}`] }, true);
    const leaves = nearbyBlocks.getBlockLocationIterator();
    const highestLeaves = /* @__PURE__ */ new Map();
    for (const { x: x2, y: y2, z: z2 } of leaves) {
      const key = `${d}/${x2}/${z2}`;
      if (!highestLeaves.has(key) || y2 > highestLeaves.get(key)) {
        highestLeaves.set(key, y2);
      }
    }
    return highestLeaves;
  }
  mergeLeaves(newLeaves, leafType) {
    for (const [key, y] of newLeaves) {
      if (!this.leaves.has(key) || y > this.leaves.get(key).height) {
        this.leaves.set(key, { height: y, id: leafType });
      }
    }
  }
  static {
    this.LeavesPalette = {
      "oak_leaves": Utils.buildRGB(63, 91, 22),
      "spruce_leaves": Utils.buildRGB(51, 81, 51),
      "birch_leaves": Utils.buildRGB(68, 89, 45),
      "acacia_leaves": Utils.buildRGB(63, 91, 22),
      "dark_oak_leaves": Utils.buildRGB(63, 91, 22),
      "mangrove_leaves": Utils.buildRGB(63, 91, 22),
      "pale_oak_leaves": Utils.buildRGB(120, 130, 120),
      "cherry_leaves": Utils.buildRGB(239, 124, 163),
      "jungle_leaves": Utils.buildRGB(63, 91, 22),
      "azalea_leaves": Utils.buildRGB(63, 91, 22),
      "azalea_leaves_flowered": Utils.buildRGB(225, 76, 232)
    };
  }
};

// src/api/SystemEvents.ts
var players = [];
var trackIndex = 0;
function* getBlocksFromSubChunk(queryIndex, subchunks) {
  const blockAssets = [];
  let leavesPositions = /* @__PURE__ */ new Map();
  for (const [subchunkKey, subchunkArray] of Object.entries(subchunks)) {
    if (queryIndex >= subchunkArray.length) continue;
    const dim = subchunkKey.split("/")[0];
    const f = subchunkArray[queryIndex];
    const d = Number(dim);
    for (let x = f.x1; x <= f.x2; x++) {
      for (let z = f.z1; z <= f.z2; z++) {
        blockAssets.push({ x, z, d });
      }
    }
    if (queryIndex === 3) ChunksCache.add(subchunkKey);
  }
  for (const { x, z, d } of blockAssets) {
    const key = `${d}/${x}/${z}`;
    if (GlobalCache.has(key)) continue;
    const isNether = d == 1;
    let leavesPositions2 = /* @__PURE__ */ new Map();
    try {
      const block = Dimensions[d].getTopmostBlock({ x, z }, isNether ? 90 : void 0);
      if (block) {
        const blockMap = new BlockMapBuilder(block);
        const blockColor = new BlockColorBuilder(blockMap);
        const liquid = block.above();
        if (liquid) {
          const wb = liquid;
          const isWater = wb.isWaterlogged || wb.typeId.includes("water");
          const isLava = wb.typeId.includes("lava");
          if (isLava) blockColor.color = PreBuildColors.Lava;
          else if (isWater) blockColor.setWaterFilter(blockColor.color);
        }
        if (block.typeId.includes("_log") && block.permutation.getState("pillar_axis") === "y") {
          const possibleTree = new TreeEngine(block);
          for (const [leafKey, leafValue] of possibleTree.leaves) {
            if (!leavesPositions2.has(leafKey) || leafValue.height > leavesPositions2.get(leafKey).height) {
              leavesPositions2.set(leafKey, leafValue);
            }
          }
        }
        const nb = GlobalCache.get(`${d}/${x - 1}/${z}`);
        const { r, g, b } = blockColor.color;
        if (nb) {
          if (blockMap.height > nb.height) blockColor.color = Utils.buildRGB(r * 1.05, g * 1.05, b * 1.05);
          else if (blockMap.height < nb.height) blockColor.color = Utils.buildRGB(r * 0.95, g * 0.95, b * 0.95);
        }
        const glyphIcon = ColorManager.getGlyphFromRGB(blockColor.color);
        GlobalCache.set(key, blockMap);
        GlyphsCache.set(key, glyphIcon);
      }
      leavesPositions2.forEach(({ height, id }, k) => {
        if (!GlobalCache.has(k)) return;
        const savedBlock = GlobalCache.get(k);
        if (savedBlock.height > height) return;
        const [d2, x2, z2] = k.split("/");
        const leaveMap = {
          dim: d2,
          height,
          typeId: "minecraft:" + id,
          isWaterlogged: false,
          location: { x: Number(x2), y: height, z: Number(z2) },
          color: TreeEngine.LeavesPalette[id]
        };
        const blockColor = new BlockColorBuilder(leaveMap);
        const nb = GlobalCache.get(`${d2}/${Number(x2) - 1}/${z2}`);
        const { r, g, b } = blockColor.color;
        if (nb) {
          if (leaveMap.height > nb.height) blockColor.color = Utils.buildRGB(r * 1.05, g * 1.05, b * 1.05);
          else if (leaveMap.height < nb.height) blockColor.color = Utils.buildRGB(r * 0.95, g * 0.95, b * 0.95);
        }
        const glyphIcon = ColorManager.getGlyphFromRGB(blockColor.color);
        GlobalCache.set(k, leaveMap);
        GlyphsCache.set(k, glyphIcon);
      });
      yield;
    } catch {
    }
  }
}
function* clearCache(chunksLoaded) {
  const blocksCached = /* @__PURE__ */ new Set();
  const cachedChunks = Array.from(ChunksCache);
  for (const chunk of cachedChunks) {
    if (!chunksLoaded.has(chunk)) {
      ChunksCache.delete(chunk);
      continue;
    }
    const [d, x, z] = chunk.split("/");
    const wx = Number(x) * 16, wz = Number(z) * 16;
    const bounds = new ChunkMapBuilder(wx, wz).split();
    for (const f of bounds) {
      for (let x2 = f.x1; x2 <= f.x2; x2++) {
        for (let z2 = f.z1; z2 <= f.z2; z2++) {
          blocksCached.add(`${d}/${x2}/${z2}`);
        }
      }
    }
    yield;
  }
  for (const blockKey of Array.from(GlobalCache.keys())) {
    if (!blocksCached.has(blockKey)) {
      GlobalCache.delete(blockKey);
      GlyphsCache.delete(blockKey);
    }
    yield;
  }
}
function* grapMaps(players2) {
  for (const player of players2) {
    if (!player || !player.isValid) continue;
    const playerMap = new PlayerMap(player);
    const playerBlocks = playerMap.getBlockAssets(15).map(
      (row) => row.map(({ x, z, d }) => GlyphsCache.get(`${d}/${x}/${z}`) ?? VoidGlyph).reverse()
    );
    const blocksData = playerBlocks.map((r) => r.join("")).join("\n");
    const playerRotation = player.getRotation().y;
    const viewDirection = Utils.getDirection(playerRotation);
    player.onScreenDisplay.setTitle(`!mm.${viewDirection}.${blocksData}`);
    yield;
  }
}
system.runInterval(() => {
  players = world2.getAllPlayers();
  if (trackIndex >= 4) trackIndex = 0;
  let subchunks = {};
  for (const player of players) {
    try {
      const v = player.getVelocity();
      const isSprinting = player.isSprinting;
      const soFast = Math.abs(Number(v.x.toFixed(2))) > 0.5 || Math.abs(Number(v.z.toFixed(2))) > 0.5;
      if (player.isGliding || soFast) continue;
      const dim = Utils.dimensionsID[player.dimension.id];
      const chunksMesh = new WorldMapBuilder(player.location, isSprinting ? 1 : 2);
      chunksMesh.chunks.forEach((c) => {
        const k = `${dim}/${c.world.x}/${c.world.z}`;
        if (!subchunks[k]) subchunks[k] = c.split();
      });
    } catch {
    }
  }
  system.runJob(getBlocksFromSubChunk(trackIndex, subchunks));
  trackIndex++;
}, 3);
system.runInterval(() => {
  let chunksLoaded = /* @__PURE__ */ new Set();
  for (const player of players) {
    try {
      const dim = Utils.dimensionsID[player.dimension.id];
      const chunksMesh = new WorldMapBuilder(player.location, 2);
      chunksMesh.chunks.forEach((c) => {
        const k = `${dim}/${c.world.x}/${c.world.z}`;
        if (ChunksCache.has(k)) chunksLoaded.add(k);
      });
    } catch {
    }
  }
  system.runJob(clearCache(chunksLoaded));
}, 200);
system.runInterval(() => system.runJob(grapMaps(players)));
system.beforeEvents.watchdogTerminate.subscribe((e) => e.cancel = true);

// src/api/BlockEvents.ts
import { world as world3 } from "@minecraft/server";
function updateBlock(updateBlock2) {
  if (!updateBlock2) return;
  const { x, z } = updateBlock2.location;
  const d = Utils.dimensionsID[updateBlock2.dimension.id];
  const key = `${d}/${x}/${z}`;
  const isNether = d == 1;
  const block = updateBlock2.dimension.getTopmostBlock(updateBlock2.location, isNether ? 90 : void 0);
  if (block) {
    const blockMap = new BlockMapBuilder(block);
    const blockColor = new BlockColorBuilder(blockMap);
    const liquid = block.above();
    if (liquid) {
      const wb = liquid;
      const isWater = wb.isWaterlogged || wb.typeId.includes("water");
      const isLava = wb.typeId.includes("lava");
      if (isLava) blockColor.color = PreBuildColors.Lava;
      else if (isWater) blockColor.setWaterFilter(blockColor.color);
    }
    const nb = GlobalCache.get(`${d}/${x - 1}/${z}`);
    const { r, g, b } = blockColor.color;
    if (nb) {
      if (blockMap.height > nb.height) blockColor.color = Utils.buildRGB(r * 1.05, g * 1.05, b * 1.05);
      else if (blockMap.height < nb.height) blockColor.color = Utils.buildRGB(r * 0.95, g * 0.95, b * 0.95);
    }
    const glyphIcon = ColorManager.getGlyphFromRGB(blockColor.color);
    GlobalCache.set(key, blockMap);
    GlyphsCache.set(key, glyphIcon);
  } else {
    GlobalCache.delete(key);
  }
}
function updateBlocks(block) {
  updateBlock(block);
  updateBlock(block.east());
  updateBlock(block.west());
}
world3.afterEvents.blockExplode.subscribe(({ block }) => updateBlocks(block));
world3.afterEvents.playerBreakBlock.subscribe(({ block }) => updateBlocks(block));
world3.afterEvents.playerPlaceBlock.subscribe(({ block }) => updateBlocks(block));
//# sourceMappingURL=main.js.map
