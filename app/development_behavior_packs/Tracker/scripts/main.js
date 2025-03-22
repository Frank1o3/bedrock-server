import * as server from "@minecraft/server";
import { AdminPanel } from "./gui/Admin";
import * as data from "@minecraft/vanilla-data";

var PVPMode = false;
const spawn = { x: -4171, y: 304, z: -25601 };
const left = { x: -4205, y: 307, z: -25588 };
const right = { x: -4158, y: 302, z: -25628 };
const world = server.world;
const system = server.system;
const PlayerTargets = new Map();
const PlayerArrows = new Map(); // Store arrows tracking each player
const PlayersInventory = new Map(); // Store players' inventories

world.beforeEvents.itemUse.subscribe((eventData) => {
    const Player = eventData.source;
    const Item = eventData.itemStack;
    const Dimention = world.getDimension(Player.dimension.id);

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
            let arrow = Dimention.spawnEntity("fr:arrow_particle", {
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

    if (!Player.hasTag("admin")) {
        // how can i color this message to red? You do not have permission to use this command!
        Player.sendMessage(`§cYou do not have permission to use this command!`);
    }

    const msg = eventData.message.toLowerCase();

    const Enchantments = [
        { id: "minecraft:Protection", level: 4 },
        { id: "minecraft:Unbreaking", level: 3 },
        { id: "minecraft:Mending", level: 1 },
        { id: "minecraft:Thorns", level: 3 },
        { id: "minecraft:Sharpness", level: 5 },
        { id: "minecraft:Looting", level: 3 },
        { id: "minecraft:Efficiency", level: 4 },
        { id: "minecraft:Fortune", level: 3 },
        { id: "minecraft:Power", level: 5 },
        { id: "minecraft:Flame", level: 1 },
        { id: "minecraft:Punch", level: 2 },
        { id: "minecraft:Soul_Speed", level: 3 },
        { id: "minecraft:Swift_Sneak", level: 3 },
        { id: "minecraft:Feather_Falling", level: 4 }
    ];

    const equipItems = () => {
        const items = [
            new server.ItemStack("minecraft:netherite_helmet", 1),
            new server.ItemStack("minecraft:netherite_chestplate", 1),
            new server.ItemStack("minecraft:netherite_leggings", 1),
            new server.ItemStack("minecraft:netherite_boots", 1),
            new server.ItemStack("minecraft:netherite_sword", 1),
            new server.ItemStack("minecraft:netherite_axe", 1),
            new server.ItemStack("minecraft:shield", 1),
            new server.ItemStack("minecraft:bow", 1),
            new server.ItemStack("minecraft:arrow", 255),
            new server.ItemStack("minecraft:golden_apple", 255)
        ];

        for (const item of items) {
            const enchantable = item.getComponent(server.ItemComponentTypes.Enchantable);
            if (!enchantable) continue;

            for (const enchant of Enchantments) {
                try {
                    const enchantmentType = server.EnchantmentTypes.get(enchant.id.toLowerCase()); // Get valid EnchantmentType
                    if (!enchantmentType) continue; // Skip if invalid

                    if (enchantable.canAddEnchantment({ type: enchantmentType, level: enchant.level })) {
                        enchantable.addEnchantment({ type: enchantmentType, level: enchant.level });
                    }
                } catch (error) {
                    console.warn(`Failed to apply enchantment ${enchant.id}: ${error}`);
                }
            }
        }
        return items;
    };

    if (msg === "!pvp") {
        eventData.cancel = true;
        world.sendMessage("PvP will start in 10 seconds!");
        system.runTimeout(() => {
            world.sendMessage("Equipping players with PvP gear!");
            for (const player of world.getAllPlayers()) {
                const inventory = player.getComponent(server.EntityComponentTypes.Inventory);
                const items = equipItems();
                items.forEach(item => {
                    inventory.container.addItem(item);
                });
            }
        }, 200);
    } else if (msg === "!clear") {
        eventData.cancel = true;
        world.sendMessage("Clearing players' inventories!");
        for (const player of world.getAllPlayers()) {
            player.runCommandAsync("/clear @s");
        }
    } else if (msg === "!admin") {
        eventData.cancel = true;
        // System runTimeout works with minecraft ticks (20 ticks = 1 second)
        system.runTimeout(() => {
            AdminPanel(Player);
        }, 40); // Show admin panel after 10 seconds
    } else if (msg === "!help") {
        eventData.cancel = true;
        Player.sendMessage("Commands: !pvp, !clear");
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
