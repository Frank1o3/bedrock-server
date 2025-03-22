import * as ui from "@minecraft/server-ui";
import * as server from "@minecraft/server"

export function AdminPanel(player) {
    let form = new ui.ActionFormData();
    form = form.title({
        text: "Admin Panel",
        translate: "tracker.admin_panel.title"
    });

    form = form.header({
        text: "Welcome, " + player.name + " to the admin Panel!",
        translate: "tracker.admin_panel.header"
    });

    form = form.divider();

    form = form.body({
        text: "What would you like to do?",
        translate: "tracker.admin_panel.body"
    });

    form = form.button({
        text: "Clear all players Inventory",
        translate: "tracker.admin_panel.clear"
    });
    form = form.button({
        text: "Ban a player",
        translate: "tracker.admin_panel.ban_player"
    });
    form = form.button({
        text: "Kick a player",
        translate: "tracker.admin_panel.kick_player"
    });
    form = form.button({
        text: "Teleport to a random player",
        translate: "tracker.admin_panel.teleport_to_random"
    });

    form = form.show(player).then(data => {
        if (data.canceled) return;

        if (data.selection === 0) {
            // Clear all players'
            for (const player of world.getAllPlayers()) {
                player.runCommandAsync("/clear @s");
            }
        } else if (data.selection === 1) {
            // Ban a player
            BanPlayer(player);
        }
    }).finally((done) => {
        if (done) {
            form.close();
        }
    });
}

function BanPlayer(player) {
    let form = new ui.ModalFormData();
    const Players = server.world.getAllPlayers()

    form = form.title({
        text: "Ban a player",
        translate: "tracker.admin_panel.ban_player"
    });

    form = form.header({
        text: "Select the name of the player you want to ban:",
        translate: "tracker.admin_panel.ban_player_header"
    });

    form = form.dropdown({
        options: Players.map(p => p.name),
        text: "Player:",
        translate: "tracker.admin_panel.ban_player_dropdown"
    });

    form = form.submitButton({
        text: "Ban",
        translate: "tracker.admin_panel.ban_player_submit"
    });

    form = form.show(player).then(data => {
        if (data.canceled) return;
        const dropdown = data.formValues[0];
        const Player = Players[dropdown];
        
        Player.runCommandAsync("/ban " + Player.name + " You have been banned!").then(() => {
            player.sendMessage("Successfully banned " + Player.name);
        }).catch((err) => {
            player.sendMessage("Failed to ban " + Player.name);
            console.error("Error banning player:", err);
        });

    }).finally((done) => {
        if (done) {
            form.close();
        }
    });
}