import * as server from "@minecraft/server";
import { AdminPanel } from "./gui/Admin";

const world = server.world;
const system = server.system;
const PlayerTargets = new Map();
const PlayerArrows = new Map(); // Store arrows tracking each player

world.beforeEvents.itemUse.subscribe((eventData) => {
    const Player = eventData.source;
    const Item = eventData.itemStack;
    const Dimention = Player.dimension;
    console.warn(Item.typeId);

    if (Item.typeId === "minecraft:compass") {
        let players = world.getAllPlayers().map(p => p.name);
        if (players.length > 1) {
            let NextIndex = (players.indexOf(Player.name) + 1) % players.length;
            while (players[NextIndex] === Player.name) {
                NextIndex = (NextIndex + 1) % players.length;
            }
            const Target = players[NextIndex];
            PlayerTargets.set(Player.name, Target);
            Player.sendMessage(`Tracking: ${Target}`);

            // Remove old arrow if it exists
            if (PlayerArrows.has(Player.name)) {
                let oldArrow = PlayerArrows.get(Player.name);
                oldArrow.remove();
            }

            // Summon new tracking arrow in front of the player
            const playerLoc = Player.location;
            let arrow = Dimention.spawnEntity("fr:arrow", {
                x: playerLoc.x,
                y: playerLoc.y + 1,
                z: playerLoc.z
            });

            PlayerArrows.set(Player.name, arrow);
        }
    }
});

world.beforeEvents.chatSend.subscribe((eventData) => {
    const Player = eventData.sender;
    eventData.cancel = true;
    const msg = eventData.message.toLowerCase();
    console.warn(msg);

    const Enchantments = [
        { id: "protection", level: 4 },
        { id: "unbreaking", level: 3 },
        { id: "mending", level: 1 },
        { id: "thorns", level: 3 },
        { id: "sharpness", level: 5 },
        { id: "looting", level: 3 },
        { id: "efficiency", level: 4 },
        { id: "fortune", level: 3 },
        { id: "power", level: 5 },
        { id: "flame", level: 1 },
        { id: "infinity", level: 1 },
        { id: "punch", level: 2 },
        { id: "soul_speed", level: 3 },
        { id: "swift_sneak", level: 3 },
        { id: "feather_falling", level: 4 }
    ];

    const equipItems = () => {
        const items = [
            new server.ItemStack("minecraft:netherite_helmet", 1),
            new server.ItemStack("minecraft:netherite_chestplate", 1),
            new server.ItemStack("minecraft:netherite_leggings", 1),
            new server.ItemStack("minecraft:netherite_boots", 1),
            new server.ItemStack("minecraft:netherite_sword", 1),
            new server.ItemStack("minecraft:bow", 1),
            new server.ItemStack("minecraft:arrow", 64 * 10),
            new server.ItemStack("minecraft:golden_apple", 64 * 10)
        ];

        for (const item of items) {
            const enchantable = item.getComponent("minecraft:enchantable");
            if (!enchantable) continue;

            for (const enchant of Enchantments) {
                if (enchantable.canAddEnchantment({ type: enchant.id, level: enchant.level })) {
                    enchantable.addEnchantment({ type: enchant.id, level: enchant.level });
                }
            }
        }
        return items;
    };

    if (msg === "!pvp") {
        world.sendMessage("PvP will start in 10 seconds!");
        setTimeout(() => {
            world.sendMessage("Equipping players with PvP gear!");
            for (const player of world.getAllPlayers()) {
                const inventory = player.getComponent("minecraft:inventory").container;
                equipItems().forEach(item => inventory.addItem(item));
            }
        }, 10000);
    } else if (msg === "!clear") {
        world.sendMessage("Clearing players' inventories!");
        for (const player of world.getAllPlayers()) {
            const inventory = player.getComponent("minecraft:inventory").container;
            inventory.clear();
        }
    } else if (msg === "!adminPanel") {
        AdminPanel(Player);
    }
});

// Update arrow direction every tick
system.runInterval(() => {
    PlayerTargets.forEach((targetName, playerName) => {
        let Target_Player = world.getAllPlayers().find(p => p.name === targetName);
        let Player = world.getAllPlayers().find(p => p.name === playerName);
        let Arrow = PlayerArrows.get(playerName);
        if (!Target_Player || !Player || !Arrow) return;

        // Get direction vector (normalize)
        let direction = {
            x: Target_Player.location.x - Player.location.x,
            y: Target_Player.location.y - Player.location.y,
            z: Target_Player.location.z - Player.location.z
        };
        let magnitude = Math.sqrt(direction.x ** 2 + direction.y ** 2 + direction.z ** 2);
        direction.x /= magnitude;
        direction.y /= magnitude;
        direction.z /= magnitude;

        // Position the arrow a small distance in front of the player
        let newArrowPos = {
            x: Player.location.x + direction.x * 2,
            y: Player.location.y + 1.5,
            z: Player.location.z + direction.z * 2
        };

        Arrow.teleport(newArrowPos);
        Arrow.rotation = { x: 0, y: Math.atan2(direction.x, direction.z) * (180 / Math.PI) }; // Rotate towards target
    });
}, 5); // Update every 5 ticks (~0.25s)

console.log("Tracking Arrow System Loaded!");
