// ct:/main.js
import * as mc from "@minecraft/server";

var HP_Objective = "HP";
var Player_List = Array();
var objective = mc.world.scoreboard.getObjectives().find((obj) => obj.id === HP_Objective) ?? mc.world.scoreboard.addObjective(HP_Objective, HP_Objective);

function createObjective() {
	objective = mc.world.scoreboard
		.getObjectives()
		.find((obj) => obj.id === HP_Objective);
	if (!objective) {
		objective = mc.world.scoreboard.addObjective(
			HP_Objective,
			HP_Objective
		);
	}
	objective = mc.world.scoreboard.setObjectiveAtDisplaySlot(mc.DisplaySlotId.BelowName, {
		objective,
		sortOrder: mc.ObjectiveSortOrder.Ascending
	});
}

mc.world.afterEvents.playerSpawn.subscribe((eventData) => {
	const Player = eventData.player;
	if (!Player_List.find((plr) => plr === Player)) {
		Player_List.push(Player);
	}
	if (objective && objective.isValid()) {
		let health = Math.round(
			Player.getComponent("minecraft:health").currentValue
		);
		objective.setScore(Player.name, health);
	}
});

mc.world.beforeEvents.playerLeave.subscribe((eventData) => {
	const Player = eventData.player;
	Player_List = Player_List.filter((plr) => plr !== Player);
});

function Main() {
	Player_List.forEach((player) => {
		if (objective && objective.isValid()) {
			let health = Math.round(
				player.getComponent("minecraft:health").currentValue
			);
			objective.setScore(player.name, health);
		}
	});
}

mc.system.run(() => {
	console.log("Mod Running....");
	createObjective();
	try {
		const Overworld = mc.world.getDimension(mc.MinecraftDimensionTypes.overworld);
		Overworld.runCommandAsync("gamerule showcoordinates true");
		Overworld.runCommandAsync("gamerule showdaysplayed true");
		Overworld.runCommandAsync("gamerule playerssleepingpercentage 25");
	} catch (error) {
		console.error("Error setting game rules:", error);
	}
});

mc.system.runInterval(Main, 20);