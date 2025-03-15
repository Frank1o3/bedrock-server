// ct:/main.js
import * as mc from "@minecraft/server";

var HP_Objective = "HP";
var Player_List = Array();

function createObjective() {
	let objective = mc.world.scoreboard
		.getObjectives()
		.find((obj) => obj.id === HP_Objective);
	if (!objective) {
		objective = mc.world.scoreboard.addObjective(
			HP_Objective,
			HP_Objective
		);
	}
	mc.world.scoreboard.setObjectiveAtDisplaySlot(mc.DisplaySlotId.BelowName, {
		objective,
	});
}

mc.world.afterEvents.playerSpawn.subscribe((eventData) => {
	const Player = eventData.player;
	const objective = mc.world.scoreboard
		.getObjectives()
		.find((obj) => obj.id === HP_Objective);
	if (!Player_List.find((plr) => plr === Player)) {
		Player_List.push(Player);
	}
	if (objective && objective.isValid()) {
		let health = Math.round(
			Player.getComponent("minecraft:health").current
		);
		objective.setScore(Player.name, health);
	}
});

mc.world.beforeEvents.playerLeave.subscribe((eventData) => {
	const Player = eventData.player;
	Player_List = Player_List.filter((plr) => plr !== Player);
});

function Main() {
	const objective = mc.world.scoreboard
		.getObjectives()
		.find((obj) => obj.id === HP_Objective);
	Player_List.forEach((player) => {
		if (objective && objective.isValid()) {
			let health = Math.round(
				player.getComponent("minecraft:health").current
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
	} catch (error) {
		console.error("Error setting game rules:", error);
	}
});

mc.system.runInterval(Main, 20);