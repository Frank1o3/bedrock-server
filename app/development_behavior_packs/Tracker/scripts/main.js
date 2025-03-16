import * as server from "@minecraft/server";
import { AdminPanel } from "./gui/Admin";
import * as data from "@minecraft/vanilla-data";

const world = server.world;
const system = server.system;
const PlayerTargets = new Map();
const PlayerArrows = new Map(); // Store arrows tracking each player

world.beforeEvents.itemUse.subscribe((eventData) => {
    const Player = eventData.source;
    const Item = eventData.itemStack;

    if (Item.typeId === "minecraft:compass" && (Item.nameTag === "Tracker" || Item.nameTag === "tracker")) {
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
            let arrow = world.spawnEntity("fr:arrow", {
                x: playerLoc.x,
                y: playerLoc.y + 1,
                z: playerLoc.z
            });

            PlayerArrows.set(Player.name, arrow);
        }
    } else if (Item.typeId == data.MinecraftItemTypes.Stick && Player.hasTag("Admin")) {
        AdminPanel(Player);
    }
});

world.beforeEvents.chatSend.subscribe((eventData) => {
    eventData.cancel = true;
    const msg = eventData.message.toLocaleLowerCase();

    const Enchantments = [
        data.MinecraftEnchantmentTypes.Protection,
        data.MinecraftEnchantmentTypes.Unbreaking,
        data.MinecraftEnchantmentTypes.Mending,
        data.MinecraftEnchantmentTypes.Thorns,
        data.MinecraftEnchantmentTypes.Sharpness,
        data.MinecraftEnchantmentTypes.Looting,
        data.MinecraftEnchantmentTypes.Efficiency,
        data.MinecraftEnchantmentTypes.Fortune,
        data.MinecraftEnchantmentTypes.Power,
        data.MinecraftEnchantmentTypes.Flame,
        data.MinecraftEnchantmentTypes.BowInfinity,
        data.MinecraftEnchantmentTypes.Punch,
        data.MinecraftEnchantmentTypes.SoulSpeed,
        data.MinecraftEnchantmentTypes.SwiftSneak,
        data.MinecraftEnchantmentTypes.FeatherFalling,
        data.MinecraftEnchantmentTypes.Thorns
    ];


    const Items = [
        new server.ItemStack(data.MinecraftItemTypes.NetheriteHelmet, 1),
        new server.ItemStack(data.MinecraftItemTypes.NetheriteChestplate, 1),
        new server.ItemStack(data.MinecraftItemTypes.NetheriteLeggings, 1),
        new server.ItemStack(data.MinecraftItemTypes.NetheriteBoots, 1),
        new server.ItemStack(data.MinecraftItemTypes.EnchantedGoldenApple, 64 * 2)
    ]

    Items.forEach((item) => {
        item.keepOnDeath = true;
        const a = item.getComponent(server.ItemComponentTypes.Enchantable);

        Enchantments.forEach((enchant) => {
            if (a.canAddEnchantment(enchant) && !a.hasEnchantment(enchant)) {
                a.AddEnchantment(enchant);
            }
        });
    });

    if (msg == "!pvp") {
        for (const player of world.getAllPlayers()) {
            const invetory = player.getComponent(server.EntityComponentTypes.Inventory).container;
            Items.forEach((item) => {
                invetory.addItem(item);
            });
        }
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
