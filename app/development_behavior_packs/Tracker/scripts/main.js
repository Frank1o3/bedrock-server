import * as server from "@minecraft/server";
import { AdminPanel } from "./gui/Admin";
import * as VanillaData from "../../../node_modules/@minecraft/vanilla-data";

const world = server.world;
const system = server.system;
const PlayerTargets = new Map();
const PlayerArrows = new Map(); // Store arrows tracking each player

world.beforeEvents.itemUse.subscribe((eventData) => {
    const Player = eventData.source;
    const Item = eventData.itemStack;
    const Dimention = Player.dimension;
    console.warn(Item.typeId);

    if (Item.typeId === VanillaData.MinecraftItemTypes.Compass) {
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
        { id: VanillaData.MinecraftEnchantmentTypes.Protection, level: 4 },
        { id: VanillaData.MinecraftEnchantmentTypes.Unbreaking, level: 3 },
        { id: VanillaData.MinecraftEnchantmentTypes.Mending, level: 1 },
        { id: VanillaData.MinecraftEnchantmentTypes.Thorns, level: 3 },
        { id: VanillaData.MinecraftEnchantmentTypes.Sharpness, level: 5 },
        { id: VanillaData.MinecraftEnchantmentTypes.Looting, level: 3 },
        { id: VanillaData.MinecraftEnchantmentTypes.Efficiency, level: 4 },
        { id: VanillaData.MinecraftEnchantmentTypes.Fortune, level: 3 },
        { id: VanillaData.MinecraftEnchantmentTypes.Power, level: 5 },
        { id: VanillaData.MinecraftEnchantmentTypes.Flame, level: 1 },
        { id: VanillaData.MinecraftEnchantmentTypes.BowInfinity, level: 1 },
        { id: VanillaData.MinecraftEnchantmentTypes.Punch, level: 2 },
        { id: VanillaData.MinecraftEnchantmentTypes.SoulSpeed, level: 3 },
        { id: VanillaData.MinecraftEnchantmentTypes.SwiftSneak, level: 3 },
        { id: VanillaData.MinecraftEnchantmentTypes.FeatherFalling, level: 4 }
    ];

    const equipItems = () => {
        const items = [
            new server.ItemStack(VanillaData.MinecraftItemTypes.NetheriteHelmet, 1),
            new server.ItemStack(VanillaData.MinecraftItemTypes.NetheriteChestplate, 1),
            new server.ItemStack(VanillaData.MinecraftItemTypes.NetheriteLeggings, 1),
            new server.ItemStack(VanillaData.MinecraftItemTypes.NetheriteBoots, 1),
            new server.ItemStack(VanillaData.MinecraftItemTypes.NetheriteSword, 1),
            new server.ItemStack(VanillaData.MinecraftItemTypes.NetheriteShovel, 1),
            new server.ItemStack(VanillaData.MinecraftItemTypes.NetheriteAxe, 1),
            new server.ItemStack(VanillaData.MinecraftItemTypes.NetheritePickaxe, 1),
            new server.ItemStack(VanillaData.MinecraftItemTypes.Bow, 1),
            new server.ItemStack(VanillaData.MinecraftItemTypes.Arrow, 1),
            new server.ItemStack(VanillaData.MinecraftItemTypes.GoldenApple, 64),
            new server.ItemStack(VanillaData.MinecraftItemTypes.GoldenApple, 64)
        ];

        for (const item of items) {
            const enchantable = item.getComponent(server.ItemComponentTypes.Enchantable);
            if (!enchantable) continue;

            for (const enchant of Enchantments) {
                try {
                    const enchantmentType = server.EnchantmentTypes.get(enchant.id); // Get valid EnchantmentType
                    if (!enchantmentType) continue; // Skip if invalid

                    const enchantmentInstance = new server.Enchantment(enchantmentType, enchant.level);

                    if (enchantable.canAddEnchantment(enchantmentInstance)) {
                        enchantable.addEnchantment(enchantmentInstance);
                    }
                } catch (error) {
                    console.warn(`Failed to apply enchantment ${enchant.id}: ${error}`);
                }
            }
        }
        return items;
    };

    if (msg === "!pvp") {
        world.sendMessage("PvP will start in 10 seconds!");
        system.runTimeout(() => {
            world.sendMessage("Equipping players with PvP gear!");
            for (const player of world.getAllPlayers()) {
                const inventory = player.getComponent(server.EntityComponentTypes.Inventory).container;
                equipItems().forEach(item => inventory.addItem(item));
            }
        }, 200);
    } else if (msg === "!clear") {
        world.sendMessage("Clearing players' inventories!");
        for (const player of world.getAllPlayers()) {
            const inventory = player.getComponent(server.EntityComponentTypes.Inventory);
            inventory.container.clearAll();
        }
    } else if (msg === "!adminPanel") {
        system.runTimeout(() => {
            AdminPanel(Player);
        }, 200);
    } else if (msg === "!reload") {
        world.getDimension(Player.dimension.id).runCommand("/reload");
    } else if (msg === "!help") {
        Player.sendMessage("Commands: !pvp, !clear, !adminPanel");
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
