

import { SUPER_INTERVAL } from "../config";
import { get_mob_groups, type Mob, type MobGroup, mobmap } from "./mob";

export enum Region {
    NA,
    EU,
    AS,
    Local
}

export const convert_region = (
    reg: string
) => {

    switch(reg) {
        case "US":
            return Region.NA;
        case "EU":
            return Region.EU;
        case "ASIA":
            return Region.AS;
        default:
            return Region.Local;
    }

};

class Reel {

    private date: Map<Region, Date | null> = new Map([
        [Region.NA, null],
        [Region.EU, null],
        [Region.AS, null]
    ]);

    defeat(region: Region) {

        this.date.set(region, new Date);

    }

    show(region: Region) {

        const date = this.date.get(region);

        if (!date) {
            return true;
        }

        const now = Date.now();
        const last = date.valueOf();
        const diff = now - last;

        return diff > SUPER_INTERVAL;

    }

}


export class MobReel {

    constructor() {

        for (const [_sid, mob] of mobmap) {

            this.insert(mob);

        }

    }

    private reel: Map<MobGroup, Map<number, Reel>> = new Map;
    private insert(mob: Mob) {

        const store = this.reel.get(mob.group);
        const reel = new Reel();

        if (!store) {
            this.reel.set(mob.group, new Map([
                [mob.id, reel]
            ]));
            return;
        }

        store.set(mob.id, reel);

    }
    private subreel(mob: Mob, region: Region) {

        const store = this.reel.get(mob.group);

        if (!store) {
            return false;
        }

        const reel = store.get(mob.id);

        if (!reel) {
            return false;
        }

        return reel.show(region);

    }

    defeat(mob: Mob, region: Region) {

        const store = this.reel.get(mob.group);

        if (!store) {
            return;
        }

        const reel = store.get(mob.id);

        if (!reel) {
            return;
        }

        reel.defeat(region);

    }

    show(mob: Mob, region: Region) {

        const store = this.reel.get(mob.group);

        if (!store) {
            return null;
        }

        const reel = store.get(mob.id);

        if (!reel) {
            return null;
        }

        const groups = get_mob_groups(mob);
        const out = [];

        for (const mob2 of groups) {
            
            const date = this.subreel(mob2, region);

            if (!date) continue;

            out.push(mob2.id);

        }

        return out;

    }


}