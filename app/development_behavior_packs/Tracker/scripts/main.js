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
    const msg = eventData.message.toLocaleLowerCase();
    console.warn(msg);

    const Enchantments = {
        "minecraft:protection": 4,
        "minecraft:unbreaking": 1,
        "minecraft:mending": 1,
        "minecraft:thorns": 3,
        "minecraft:sharpness": 5,
        "minecraft:looting": 3,
        "minecraft:efficiency": 4,
        "minecraft:fortune": 5,
        "minecraft:power": 5,
        "minecraft:flame": 1,
        "minecraft:infinity": 1,
        "minecraft:punch": 2,
        "minecraft:soul_speed": 3,
        "minecraft:swift_sneak": 3,
        "minecraft:feather_falling": 4
    };

    const helmet = new server.ItemStack("minecraft:netherite_helmet", 1);
    const chestplate = new server.ItemStack("minecraft:netherite_chestplate", 1);
    const leggings = new server.ItemStack("minecraft:netherite_leggings", 1);
    const boots = new server.ItemStack("minecraft:netherite_boots", 1);
    const sword = new server.ItemStack("minecraft:netherite_sword", 1);
    const bow = new server.ItemStack("minecraft:bow", 1);
    const arrow = new server.ItemStack("minecraft:arrow", 64 * 10);
    const food = new server.ItemStack("minecraft:golden_apple", 64 * 10);

    if (msg == "!pvp") {
        const Items = [helmet, chestplate, leggings, boots, sword, bow, arrow, food];
        for (const item of Items) {
            const a = item.getComponent(server.ItemComponentTypes.Enchantable);

            if (!a) continue;

            for (const enchantment in Enchantments) {
                const e = new server.EnchantmentType(enchantment);

                if (a.canAddEnchantment(enchantment)) {
                    a.addEnchantment(enchantment, Enchantments[enchantment]);
                }
            }
        }
        world.sendMessage("PvP Empezara en 10 segundos!");
        setTimeout(() => {
            world.sendMessage("Equipando jugadores con equipo PvP!");
            for (const player of world.getAllPlayers()) {
                const invetory = player.getComponent("minecraft:inventory").container;
                Items.forEach((item) => {
                    invetory.addItem(item);
                });
            }
        }, 10000);
    } else if (msg == "!clear") {
        world.sendMessage("Limpiando inventarios de jugadores!");
        for (const player of world.getAllPlayers()) {
            const invetory = player.getComponent("minecraft:inventory").container;
            invetory.clear();
        }
    } else if (msg == "!adminPanel") {
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
