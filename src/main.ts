

// biome-ignore assist/source/organizeImports: aaad
import { FLORR_GAME_CHANNEL_ID, MAX_SUPER_LOGTIME, PORT } from "./config";
import { Packer } from "./mod/pack";
import { convert_region, MobReel, type Region } from "./mod/reel";
import { PackSignal } from "./mod/packenum";
import { florrio_get_mob_by_sid } from "./mod/florrio/mobs";
import { type Mob, mobmap } from "./mod/mob";
import { configDotenv } from "dotenv";
import { WebSocketServer } from "ws";
import { Client } from "discord.js-selfbot-v13";

const discord_serve = (port: number) => {

    configDotenv({
        path: "./.env",
        debug: true
    });

    const server = new WebSocketServer({
        port
    });

    const reel = new MobReel;

    const packer = new Packer(
        new Uint8Array(1024)
    );

    const client = new Client();

    client.on("ready", () => {
        console.log(`Logined as ${client.user?.username}`);
    });

    const broadcast = (buf: Uint8Array) => {

        for (const socket of server.clients) {

            socket.send(buf);

        }

    };

    const write_craft = (
        id: string,
        message: string,
        is_super: boolean
    ) => {

        packer.write_u8(
            PackSignal.CraftNotify
        );

        packer.write_u8_str(id);
        packer.write_u8_str(message);
        packer.write_u8(is_super ? 1 : 0);

        const buf = packer.release_view();

        return buf;

    };

    const write_rift = (
        id: string,
        region: Region
    ) => {

        packer.write_u8(
            PackSignal.RiftNotify
        );

        packer.write_u8_str(id);
        packer.write_u8(region);

        const buf = packer.release_view();

        return buf;

    };

    const write_spawn = (
        id: string,
        id_mob: number,
        region: Region,
        is_super: boolean,

        mob?: Mob
    ) => {

        packer.write_u8(
            PackSignal.SpawnNotify
        );

        packer.write_u8_str(id);
        packer.write_u8(id_mob);
        packer.write_u8(region);
        packer.write_u8(is_super ? 1 : 0);

        const fn = () => {

            if (!mob || !is_super) {
                packer.write_u8(0);
                return;
            }

            const spawns = reel.show(mob, region);

            if (!spawns?.length) {
                packer.write_u8(0);
                return;
            }

            packer.write_u8(spawns.length);

            for (const id of spawns) {
                packer.write_u8(id);
            }

        };

        fn();

        const buf = packer.release_view();

        return buf;

    };

    const write_summon = (
        id: string,
        id_mob: number,
        region: Region,
        is_super: boolean
    ) => {

        packer.write_u8(
            PackSignal.SummonNotify
        );

        packer.write_u8_str(id);
        packer.write_u8(id_mob);
        packer.write_u8(region);
        packer.write_u8(is_super ? 1 : 0);

        const buf = packer.release_view();

        return buf;

    };

    const write_defeat = (
        id: string,
        id_mob: number,
        region: Region,
        is_super: boolean,
        message: string,

        mob?: Mob
    ) => {

        packer.write_u8(
            PackSignal.DefeatNotify
        );

        packer.write_u8_str(id);
        packer.write_u8(id_mob);
        packer.write_u8(region);
        packer.write_u8(is_super ? 1 : 0);

        if (mob && is_super) reel.defeat(mob, region);

        // ...defeated by ,, and !
        const list = message.split("ed by").at(1)
            ?.replace(" and ", ",")
            .replaceAll(" ", "")
            .replace("!", "")
            .split(",");

        if (list) {

            packer.write_u8(list.length);

            for (const name of list) {
                packer.write_u8_str(name);
            }

        } else {

            packer.write_u8(0);

        }

        const buf = packer.release_view();

        return buf;

    };

    const serialize_text = (text: string) => {
        return text.replace(/[\n\u200B]/g, "");
    };

    // notify
    client.on("messageCreate", msg => {

        if (msg.channelId !== FLORR_GAME_CHANNEL_ID) {
            return;
        }

        const message = msg.embeds.at(0);

        if (!message) return;

        const tag = message.footer?.text;
        const text = serialize_text(message.description ?? "");
        const is_super = message.color !== 0x555555;

        // Craft
        if (!tag) {

            const buf = write_craft(msg.id, text, is_super);

            broadcast(buf);

            return;
        }

        {

            const is_defeated = text.includes("n d");
            const is_summoned = text.includes("n s");
            const is_rift = text === "A mysterious rift has opened!";

            // console.log(text);

            const region = tag.match(/\((.*?)\)/i)?.[1];
            const region_id = convert_region(region ?? "");

            console.log(text, "\n", text.length, "defeated: ", is_defeated, "summoned: ", is_summoned, "rift: ", is_rift)

            if (is_rift) {
                const buf = write_rift(
                    msg.id,
                    region_id
                );
                broadcast(buf);
                return;
            }

            const n = message.thumbnail?.url.split("/");
            const nam = n ? n[n.length - 1].split(".png")[0].split("-")[1] : null;
            const name = nam ?? "";

            const id = florrio_get_mob_by_sid(name)?.id;

            if (!id) return;

            const mob = mobmap.get(name);

            const buf =
            is_defeated ? write_defeat(
                msg.id,
                id,
                region_id,
                is_super,
                text,
                mob
            )
            : is_summoned ? write_summon(
                msg.id,
                id,
                region_id,
                is_super
            )
            : write_spawn(
                msg.id,
                id,
                region_id,
                is_super,
                mob
            );

            broadcast(buf);

        }

    });

    // defeat
    client.on("messageUpdate", async (_a, b) => {

        if (b.channelId !== FLORR_GAME_CHANNEL_ID) {
            return;
        }

        const msg = b.partial ? await b.fetch() : b;

        const message = msg.embeds.at(0);

        if (!message) return;

        //const x = msg.editedAt?.valueOf() ?? 0; <- looks buggy
        const x = Date.now();
        const y = msg.createdAt.valueOf();

        const diff = x - y;
        const abs = Math.abs(diff);

        if (abs > MAX_SUPER_LOGTIME) {
            return;
        }

        const tag = message.footer?.text;

        // Craft
        if (!tag) {
            return;
        }

        const n = message.thumbnail?.url.split("/");
        const nam = n ? n[n?.length - 1].split(".png")[0].split("-")[1] : null;
        const name = nam ?? "";

        const region = tag.match(/\((.*?)\)/i)?.[1];
        const region_id = convert_region(region ?? "");

        const id = florrio_get_mob_by_sid(name)?.id;

        if (!id) return;

        const mob = mobmap.get(name);
        const is_super = message.color !== 0x555555;
        const text = serialize_text(message.description ?? "");

        const buf = write_defeat(
            msg.id,
            id,
            region_id,
            is_super,
            text,
            mob
        );

        broadcast(buf);

    });

    client.login(
        process.env.TOKEN
    );

};

discord_serve(PORT);
