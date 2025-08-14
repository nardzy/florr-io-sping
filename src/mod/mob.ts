

export interface Mob {
    id: number,
    group: MobGroup
}

export enum MobGroup {
    Centipede,
    Ladybug,
    Beetle,
    Spider,
    Wasp,
    Firefly,
    Crab,
    Leafbug
}

// ignore hel mobs, they have same spawn message

export const mobmap: Map<string, Mob> = new Map([

    // Centi
    [
        "centipede",
        {
            id: 12,
            group: MobGroup.Centipede
        }
    ],
    [
        "centipede_evil",
        {
            id: 14,
            group: MobGroup.Centipede
        }
    ],
    [
        "centipede_desert",
        {
            id: 16,
            group: MobGroup.Centipede
        }
    ],
    /*[
        "centipede_hel",
        {
            id: 53,
            group: MobGroup.Centipede
        }
    ],*/

    // Lady
    [
        "ladybug",
        {
            id: 3,
            group: MobGroup.Ladybug
        }
    ],
    [
        "ladybug_dark",
        {
            id: 19,
            group: MobGroup.Ladybug
        }
    ],
    [
        "ladybug_shiny",
        {
            id: 20,
            group: MobGroup.Ladybug
        }
    ],

    // Beetle
    [
        "beetle",
        {
            id: 10,
            group: MobGroup.Beetle
        }
    ],
    /*[
        "beetle_hel",
        {
            id: 55,
            group: MobGroup.Beetle
        }
    ],*/
    [
        "beetle_nazar",
        {
            id: 67,
            group: MobGroup.Beetle
        }
    ],
    [
        "beetle_mummy",
        {
            id: 77,
            group: MobGroup.Beetle
        }
    ],
    [
        "beetle_pharaoh",
        {
            id: 78,
            group: MobGroup.Beetle
        }
    ],


    // Spider
    [
        "spider",
        {
            id: 21,
            group: MobGroup.Spider
        }
    ],
    /*[
        "spider_hel",
        {
            id: 58,
            group: MobGroup.Spider
        }
    ],*/
    [
        "spider_mecha",
        {
            id: 72,
            group: MobGroup.Spider
        }
    ],


    // Wasp
    [
        "wasp",
        {
            id: 56,
            group: MobGroup.Wasp
        }
    ],
    /*[
        "wasp_hel",
        {
            id: 61,
            group: MobGroup.Wasp
        }
    ],*/
    [
        "wasp_mecha",
        {
            id: 71,
            group: MobGroup.Wasp
        }
    ],

    // Firefly
    [
        "firefly",
        {
            id: 54,
            group: MobGroup.Firefly
        }
    ],
    [
        "firefly_magic",
        {
            id: 65,
            group: MobGroup.Firefly
        }
    ],

    // Leafbug
    [
        "leafbug",
        {
            id: 43,
            group: MobGroup.Leafbug
        }
    ],
    [
        "leafbug_shiny",
        {
            id: 73,
            group: MobGroup.Leafbug
        }
    ],
    
    // crab
    [
        "crab",
        {
            id: 30,
            group: MobGroup.Crab
        }
    ],
    [
        "crab_mecha",
        {
            id: 74,
            group: MobGroup.Crab
        }
    ],

]);

export const get_mob_groups = (mob: Mob) => {

    const out = [];

    for (const [_sid, mob2] of mobmap) {

        if (mob.group !== mob2.group) continue;

        out.push(
            mob2
        );

    }

    return out;

};