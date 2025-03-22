import * as server from "@minecraft/server";
import * as ui from "@minecraft/server-ui";

const Ui = new ui.ActionFormData()
    .title("Form")
    .body("")
    .button("button1")
    .button("button2")
    .button("button3");

const customUi = new ui.ActionFormData()
    .title("Form")
    .body("")
    .button("button1")
    .button("button2")
    .button("button3");


var PVPMode = false;
const world = server.world;
const system = server.system;
const PlayerTargets = new Map();
const PlayerArrows = new Map();
const PlayersInventory = new Map();
const EliminatedPlayers = new Set();

world.beforeEvents.itemUse.subscribe((eventData) => {
    const Player = eventData.source;
    const Item = eventData.itemStack;
    const Dimension = world.getDimension(Player.dimension.id);

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

            if (PlayerArrows.has(Player.name)) {
                let oldArrow = PlayerArrows.get(Player.name);
                oldArrow?.remove();
            }

            let arrow = Dimension.spawnEntity("fr:arrow_particle", {
                x: Player.location.x,
                y: Player.location.y + 1,
                z: Player.location.z
            });

            PlayerArrows.set(Player.name, arrow);
        }
    } else if (Item.typeId === "minecraft:clock") {
        customUi.show(Player);
    }
});

world.beforeEvents.chatSend.subscribe((eventData) => {
    const Player = eventData.sender;
    const msg = eventData.message.toLowerCase();

    if (!Player.hasTag("admin")) {
        Player.sendMessage(`§cYou do not have permission to use this command!`);
    }

    if (msg === "!pvp" && !PVPMode) {
        eventData.cancel = true;
        PVPMode = true;
        const Overworld = server.world.getDimension("minecraft:overworld");
        Overworld.runCommand("gamerule showcoordinates " + PVPMode);

        EliminatedPlayers.clear();
        PlayersInventory.clear();

        world.sendMessage("§cPvP will start in 10 seconds! Save your items!");

        for (const player of world.getAllPlayers()) {
            const inventory = player.getComponent(server.EntityComponentTypes.Inventory);
            const storedItems = [];

            for (let i = 0; i < inventory.container.size; i++) {
                let item = inventory.container.getItem(i);
                if (item) storedItems.push(item.clone());
            }

            PlayersInventory.set(player.name, storedItems);
            player.runCommand("/clear @s");
        }

        system.runTimeout(() => {
            world.sendMessage("§cEquipping players with PvP gear!");
            for (const player of world.getAllPlayers()) {
                const inventory = player.getComponent(server.EntityComponentTypes.Inventory);
                equipItems().forEach(item => inventory.container.addItem(item));
            }
        }, 200);
    }

    if (msg === "!clear") {
        eventData.cancel = true;
        world.sendMessage("Clearing players' inventories!");
        world.getAllPlayers().forEach(player => player.runCommand("/clear @s"));
    }

    if (msg === "!admin") {
        eventData.cancel = true;
        system.runTimeout(() => AdminPanel(Player), 40);
    }

    if (msg === "!help") {
        eventData.cancel = true;
        Player.sendMessage("Commands: !pvp, !clear");
    }
});

world.afterEvents.entityDie.subscribe((eventData) => {
    const Player = eventData.deadEntity;
    if (!(Player instanceof server.Player) || !PVPMode) return;

    EliminatedPlayers.add(Player.name);
    Player.sendMessage("§cYou have been eliminated! Your inventory will be restored upon respawn.");
});

world.afterEvents.playerSpawn.subscribe((eventData) => {
    const Player = eventData.player;
    Player.runCommand("/clear @s");

    if (!PlayersInventory.has(Player.name) || !PVPMode) return;

    system.runTimeout(() => {
        const inventory = Player.getComponent(server.EntityComponentTypes.Inventory);

        PlayersInventory.get(Player.name).forEach((item) => {
            console.log(item.nameTag);
            inventory.container.addItem(item);
        });

        checkForWinner();
    }, 20);
});

function checkForWinner() {
    let alivePlayers = world.getAllPlayers().filter(p => !EliminatedPlayers.has(p.name));

    if (alivePlayers.length === 1) {
        let winner = alivePlayers[0];
        world.sendMessage(`§6${winner.name} has won the PvP match!`);
        winner.getComponent(server.EntityComponentTypes.Inventory).container.addItem(new server.ItemStack("minecraft:golden_apple", 1));
        PVPMode = false;
        const Overworld = server.world.getDimension("minecraft:overworld");
        Overworld.runCommandAsync("gamerule showcoordinates " + PVPMode);
        EliminatedPlayers.clear();
    }
}

function equipItems() {
    const Enchantments = [
        { id: "minecraft:Protection", level: 4 },
        { id: "minecraft:Unbreaking", level: 3 },
        { id: "minecraft:Mending", level: 1 },
        { id: "minecraft:Sharpness", level: 5 },
        { id: "minecraft:Looting", level: 3 },
        { id: "minecraft:Power", level: 5 }
    ];

    const items = [
        new server.ItemStack("minecraft:netherite_helmet", 1),
        new server.ItemStack("minecraft:netherite_chestplate", 1),
        new server.ItemStack("minecraft:netherite_leggings", 1),
        new server.ItemStack("minecraft:netherite_boots", 1),
        new server.ItemStack("minecraft:netherite_sword", 1),
        new server.ItemStack("minecraft:netherite_axe", 1),
        new server.ItemStack("minecraft:shield", 1),
        new server.ItemStack("minecraft:bow", 1),
        new server.ItemStack("minecraft:arrow", 64),
        new server.ItemStack("minecraft:arrow", 64),
        new server.ItemStack("minecraft:golden_apple", 64),
        new server.ItemStack("minecraft:golden_apple", 64),
        new server.ItemStack("minecraft:experience_bottle", 64),
        new server.ItemStack("minecraft:experience_bottle", 64),
    ];

    for (const item of items) {
        const enchantable = item.getComponent(server.ItemComponentTypes.Enchantable);
        if (!enchantable) continue;

        for (const enchant of Enchantments) {
            try {
                const enchantmentType = server.EnchantmentTypes.get(enchant.id.toLowerCase());
                if (!enchantmentType) continue;
                if (enchantable.canAddEnchantment({ type: enchantmentType, level: enchant.level })) {
                    enchantable.addEnchantment({ type: enchantmentType, level: enchant.level });
                }
            } catch (error) {
                console.warn(`Failed to apply enchantment ${enchant.id}: ${error}`);
            }
        }
    }

    return items;
}

// Update arrow direction every tick
system.runInterval(() => {
    PlayerTargets.forEach((targetName, playerName) => {
        let Target_Player = world.getAllPlayers().find(p => p.name === targetName);
        let Player = world.getAllPlayers().find(p => p.name === playerName);
        let Arrow = PlayerArrows.get(playerName);
        if (!Target_Player || !Player || !Arrow?.isValid()) return;

        let direction = {
            x: Target_Player.location.x - Player.location.x,
            y: Target_Player.location.y - Player.location.y,
            z: Target_Player.location.z - Player.location.z
        };
        let magnitude = Math.sqrt(direction.x ** 2 + direction.y ** 2 + direction.z ** 2);
        direction.x /= magnitude;
        direction.y /= magnitude;
        direction.z /= magnitude;

        Arrow.teleport({
            x: Player.location.x + direction.x * 2,
            y: Player.location.y + 1.5,
            z: Player.location.z + direction.z * 2
        });
        Arrow.rotation = { x: 0, y: Math.atan2(direction.x, direction.z) * (180 / Math.PI) };
    });
}, 5);

console.log("PvP & Tracking System Loaded!");
