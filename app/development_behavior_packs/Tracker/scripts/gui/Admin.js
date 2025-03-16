import * as ui from "@minecraft/server-ui";
import * as server from "@minecraft/server"

export function AdminPanel(player) {
    const form = new ui.ActionFormData();

    // Form Title & Body
    form.title("Admin Menu");
    form.body("Welcome to the Admin Menu")

    // Button's
    form.button("Kick Player");
    form.button("Ban Player");
    form.button("Tp Player");
    form.button("Kill Player");
    form.button("Close");

    // Show UI
    form.show(player).then(r => {
        if (r.selection == 0) Kick(player);
        if (r.selection == 1) Ban(player);
        if (r.selection == 2) Tp(player);
        if (r.selection == 3) player.kill();
    });
}


// Define Tp GUI
function Tp(player) {
    const form2 = new ui.ModalFormData()
    form2.title("Teleport Player");
    form2.body("Enter the coordinates for teleportation:");
    form2.textField("From", "Player name", "");
    form2.textField("To", "Player name", "");
    form2.submitButton("Teleport");

    form2.show(player).then(r => {
        if (r.formValues[0] in server.world.getAllPlayers()) {
            const player1 = server.world.getAllPlayers().find((a) => { a.name == r.formValues[0] });
            if (r.formValues[1] in server.world.getAllPlayers()) {
                const player2 = server.world.getAllPlayers().find((a) => { a.name == r.formValues[1] });
                player1.teleport(player2.location);
                player1.sendMessage(`Teleported to ${player2.name}`);
            } else {
                player1.sendMessage("Player not found.");
            }
        }
    });
}