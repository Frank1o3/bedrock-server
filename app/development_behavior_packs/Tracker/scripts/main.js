import * as server from "@minecraft/server";
import * as data from "@minecraft/vanilla-data";

const world = server.world;
const system = server.system;
const Players = [];
const PlayerTargets = new Map(); // Tracks each player's selected target

world.afterEvents.playerSpawn.subscribe((eventData) => {
    const Player = eventData.player;

    if (!Players.includes(Player.name)) {
        Players.push(Player.name);
    }
});

world.beforeEvents.playerLeave.subscribe((eventData) => {
    const Player = eventData.player;

    Players.splice(Players.indexOf(Player.name), 1);
    PlayerTargets.delete(Player.name);
});

world.beforeEvents.itemUse.subscribe((eventData) => {
    eventData.cancel = true;
    const Player = eventData.source;
    const Item = eventData.itemStack;

    if (Item?.typeId === data.MinecraftItemTypes.compass && Item.nameTag?.toLowerCase() === "tracker") {
        if (Players.length > 1) {
            let TargetIndex = Players.indexOf(Player.name);
            let NextIndex = (TargetIndex + 1) % Players.length;

            while (Players[NextIndex] === Player.name) {
                NextIndex = (NextIndex + 1) % Players.length;
            }

            const Target = Players[NextIndex];
            PlayerTargets.set(Player.name, Target); // Store target
            Player.sendMessage(`Tracking: ${Target}`); // Notify player
        }
    }
});

// Main Loop - Updates Compass Direction
function Main() {
    PlayerTargets.forEach((targetName, playerName) => {
        const Target_Player = world.getAllPlayers().find((p) => p.name === targetName);
        const Player = world.getAllPlayers().find((p) => p.name === playerName);

        if (!Target_Player || !Player) return;

        // Get target's position
        const targetLocation = Target_Player.location;

        // Update the compass to track the target
        Player.runCommand(`execute as @s at @s run particle minecraft:composter_fill ${targetLocation.x} ${targetLocation.y} ${targetLocation.z} 0 0 0 0 1 force`);

        // Notify the player
        Player.sendMessage(`Compass is tracking: ${targetName}`);
    });
}

system.run(() => {
    console.log("Mod Script Loaded!");
});

// Start Main Loop
system.runInterval(Main, 20);
