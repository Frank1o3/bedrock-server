import * as ui from "@minecraft/server-ui";
import * as server from "@minecraft/server"

export function AdminPanel(player) {
    let form = new ui.ModalFormData();
    form = form.title("Teleport Player");
    form = form.body("Enter the coordinates for teleportation:");
    form = form.textField("From", "Player name", "");
    form = form.textField("To", "Player name", "");
    form = form.submitButton("Teleport");

    form.show(player).then(r => {
        if (r.formValues[0] in server.world.getAllPlayers()) {
            const player1 = server.world.getAllPlayers().find((a) => { a.name == r.formValues[0] });
            if (r.formValues[1] in server.world.getAllPlayers()) {
                const player2 = server.world.getAllPlayers().find((a) => { a.name == r.formValues[1] });
                player1.teleport(player2.location);
                player1.sendMessage(`Teleported to ${player2.name}`);
                form.close();
            } else {
                player1.sendMessage("Player not found.");
                form.close();
            }
        }
    });
    return;
}