// ct:/main.js
import * as mc from "@minecraft/server";

const HP_Objective = "HP";

function createObjective() {
	const existingObjective = mc.world.scoreboard.getObjective(HP_Objective);
	if (!existingObjective) {
		const objective = mc.world.scoreboard.addObjective(
			HP_Objective,
			HP_Objective
		);
		mc.world.scoreboard.setObjectiveAtDisplaySlot(mc.DisplaySlotId.BelowName, {
			objective: objective,
			sortOrder: mc.ObjectiveSortOrder.Ascending
		});
	}
}

mc.world.afterEvents.playerSpawn.subscribe((eventData) => {
	const scoreboard = mc.world.scoreboard.getObjective(HP_Objective);
	const Player = eventData.player;

	if (scoreboard && scoreboard.isValid()) {
		let health = Math.floor(
			Player.getComponent("minecraft:health").currentValue
		);
		scoreboard.setScore(Player.name, health);
	}
});

function Main() {
	const scoreboard = mc.world.scoreboard.getObjective(HP_Objective);

	for (const player of mc.world.getPlayers()) {
		const healthComponent = player.getComponent("minecraft:health");
		if (healthComponent) {
			const currentHealth = Math.floor(healthComponent.currentValue); // Round health to an integer
			try {
				scoreboard.setScore(player, currentHealth);
			} catch (error) {
				console.error(`❌ Error updating ${player.name}'s HP:`, error);
			}
		}
	};
}

mc.system.run(() => {
	console.log("Mod Running....");

	createObjective();
	Main();

	try {
		const Overworld = mc.world.getDimension("minecraft:overworld");
		Overworld.runCommandAsync("gamerule showcoordinates true");
		Overworld.runCommandAsync("gamerule showdaysplayed true");
		Overworld.runCommandAsync("gamerule playerssleepingpercentage 25");
	} catch (error) {
		console.error("Error setting game rules:", error);
	}
});

mc.system.runInterval(Main, 10);