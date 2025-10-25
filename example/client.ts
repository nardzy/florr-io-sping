
enum Region {
    NA,
    EU,
    AS,
    Local
}

enum PackSignal {
    CraftNotify,
    SpawnNotify,
    DefeatNotify,
    SummonNotify
}

const convert_region = (
    reg: Region
) => {

    switch (reg) {
        case Region.NA:
            return "NA";
        case Region.EU:
            return "EU";
        case Region.AS:
            return "AS";
        default:
            return "LOCAL";
    }

};

class PackConsts {

    offset = 0;

    constructor(public v: Uint8Array) { }

}

class SavedOffset {

    constructor(public offset: number) { }

}

class PackerCore extends PackConsts {

    offset_last = 0;
    offset_last_view = 0;
    stack_index = 0;
    saved_stack: Map<number, SavedOffset> = new Map;

    init() {

        this.offset = 0;
        this.offset_last = 0;
        this.offset_last_view = 0;

    }

    save(o: number) {

        this.saved_stack.set(
            this.stack_index,
            new SavedOffset(this.offset)
        );

        this.offset_last = this.offset;
        this.offset += o;
        this.offset_last_view = this.offset;

        return this.stack_index++;

    }

    restore(id: number) {

        const saved = this.saved_stack.get(id);

        if (saved === undefined) {
            return;
        }

        this.offset_last = this.offset;
        this.offset = saved.offset;
        this.offset_last_view = this.offset;

        this.saved_stack.delete(id);

    }

    back() {

        const offset = this.offset_last;

        this.offset_last = this.offset;
        this.offset = offset;
        this.offset_last_view = this.offset;

    }

    write_u8(u: number) {

        this.v[this.offset++] = u & 255;

    }

    write_u16(u: number) {

        this.v[this.offset] = u & 255;
        this.v[this.offset + 1] = u >>> 8;
        this.offset += 2;

    }

    write_u32(u: number) {

        this.v[this.offset] = u & 255;
        this.v[this.offset + 1] = u >>> 8;
        this.v[this.offset + 2] = u >>> 16;
        this.v[this.offset + 3] = u >>> 24;
        this.offset += 4;

    }

    write_i8(i: number) {

        this.v[this.offset++] = i & 255;

    }

    write_i16(i: number) {

        this.v[this.offset] = i & 255;
        this.v[this.offset + 1] = i >> 8;
        this.offset += 2;

    }

    write_i32(i: number) {

        this.v[this.offset] = i & 255;
        this.v[this.offset + 1] = i >> 8;
        this.v[this.offset + 2] = i >> 16;
        this.v[this.offset + 3] = i >> 24;
        this.offset += 4;

    }

    write_f32(fl: number) {

        const sign = fl < 0 ? 1 : 0;
        const f = Math.abs(fl);

        const exponent = Math.log2(f) | 0
        const float = f / (1 << exponent) - 1;
        const m = Math.round(float * (1 << 23));

        const bits = (sign << 31) | ((exponent + 127) << 23) | m;

        this.write_u32(bits);

    }

    calc_bits(data: boolean[]) {

        let bits = 0;

        for (let i = 0; i < data.length; i++) {

            if (!data[i]) continue;

            bits |= 1 << i;

        }

        return bits;

    }

    write_u8_bits(data: boolean[]) {
        this.write_u8(this.calc_bits(data));
    }

    write_u16_bits(data: boolean[]) {
        this.write_u16(this.calc_bits(data));
    }

    write_u32_bits(data: boolean[]) {
        this.write_u32(this.calc_bits(data));
    }

    write_str(s: string) {

        for (const c of s) {

            const code = c.codePointAt(0) ?? 0;

            if (code < 128) {
                this.v[this.offset++] = code;
                continue;
            }

            if (code < 2048) {
                this.v[this.offset] = code >>> 6 | 192;
                this.v[this.offset + 1] = code & 63 | 128;
                this.offset += 2;
                continue;
            }

            if (code < 65536) {
                this.v[this.offset] = code >>> 12 | 224
                this.v[this.offset + 1] = code >>> 6 | 128;
                this.v[this.offset + 2] = code & 63 | 128;
                this.offset += 3;
                continue;
            }

            this.v[this.offset] = code >>> 18 | 240;
            this.v[this.offset + 1] = code >>> 12 | 128;
            this.v[this.offset + 2] = code >>> 6 | 128;
            this.v[this.offset + 3] = code & 63 | 128;
            this.offset += 4;

        }

    }

    write_u8_str(s: string) {

        const i = this.save(1);

        this.write_str(s);

        const len = this.offset - this.offset_last_view;

        this.restore(i);
        this.write_u8(len);
        this.back();


    }

    write_u32_str(s: string) {

        const i = this.save(4);

        this.write_str(s);

        const len = this.offset - this.offset_last_view;

        this.restore(i);
        this.write_u32(len);
        this.back();


    }

}

class Packer extends PackerCore {

    sub = new PackerCore(
        this.v.subarray(this.v.byteLength * .5)
    );

    push() {

        this.v.copyWithin(
            this.offset,
            this.sub.v.byteLength,
            this.sub.v.byteLength + this.sub.offset
        );

        this.offset += this.sub.offset;
        this.sub.init();

    }

    release() {

        this.init();

        return this.v;

    }

    release_view() {

        const offset = this.offset;

        this.init();

        return this.v.subarray(0, offset);

    }

}

class Parser extends PackConsts {

    offset_rev = this.v.byteLength - 1;

    read_u8(reverse?: boolean) {

        return this.v[reverse ? this.offset_rev-- : this.offset++];

    }

    read_u16(reverse?: boolean) {

        if (reverse) {

            const read = (
                this.v[this.offset_rev - 1] |
                this.v[this.offset_rev] << 8
            );

            this.offset_rev -= 2;

            return read;

        }

        const read = (
            this.v[this.offset] |
            this.v[this.offset + 1] << 8
        );

        this.offset += 2;

        return read;

    }

    read_u32(reverse?: boolean) {

        if (reverse) {

            const read = (
                this.v[this.offset_rev - 3] |
                this.v[this.offset_rev - 2] << 8 |
                this.v[this.offset_rev - 1] << 16 |
                this.v[this.offset_rev] << 24
            );

            this.offset_rev -= 4;

            return read;

        }

        const read = (
            this.v[this.offset] |
            this.v[this.offset + 1] << 8 |
            this.v[this.offset + 2] << 16 |
            this.v[this.offset + 3] << 24
        );

        this.offset += 4;

        return read;

    }

    read_i8(reverse?: boolean) {

        return this.v[reverse ? this.offset_rev-- : this.offset++] << 24 >> 24;

    }

    read_i16(reverse?: boolean) {

        if (reverse) {

            const read = (
                this.v[this.offset_rev - 1] |
                this.v[this.offset_rev] << 8
            ) << 16 >> 16;

            this.offset_rev -= 2;

            return read;

        }

        const read = (
            this.v[this.offset] |
            this.v[this.offset + 1] << 8
        ) << 16 >> 16;

        this.offset += 2;

        return read;

    }

    read_i32(reverse?: boolean) {

        if (reverse) {

            const read = (
                this.v[this.offset_rev - 3] |
                this.v[this.offset_rev - 2] << 8 |
                this.v[this.offset_rev - 1] << 16 |
                this.v[this.offset_rev] << 24
            );

            this.offset_rev -= 4;

            return read;

        }

        const read = (
            this.v[this.offset] |
            this.v[this.offset + 1] << 8 |
            this.v[this.offset + 2] << 16 |
            this.v[this.offset + 3] << 24
        );

        this.offset += 4;

        return read;

    }

    read_f32() {

        const bits = this.read_u32();

        const sign = bits >> 31 & 1;
        const float = bits >> 23 & 255;
        const m = bits & 0x7FFFFF;

        const mv = 1 + m / (1 << 23);

        return (-1) ** sign * mv * 2 ** (float - 127);

    }

    read_u8_bits(len: number, reverse?: boolean) {

        const bits = this.read_u8(reverse);
        const data = new Uint8Array(len);

        for (let i = 0; i < len; i++) {

            if (!(bits & 1 << i)) continue;

            data[i] = 1;

        }

        return data;

    }

    read_str(len: number) {

        let out = "";

        while (this.offset < len) {

            const i = this.v[this.offset];

            if (!(i & 128)) {

                out += String.fromCharCode(i);
                this.offset++;
                continue;

            }

            if (i < 224) {

                const read = (
                    (i & 31) << 6 |
                    this.v[this.offset + 1] & 63
                );

                this.offset += 2;
                out += String.fromCodePoint(read);
                continue;

            }

            if (i < 240) {

                const read = (
                    (i & 15) << 12 |
                    (this.v[this.offset + 1] & 63) << 6 |
                    this.v[this.offset + 2] & 63
                );

                this.offset += 3;
                out += String.fromCodePoint(read);
                continue;

            }

            const read = (
                (i & 7) << 18 |
                (this.v[this.offset + 1] & 63) << 12 |
                (this.v[this.offset + 2] & 63) << 6 |
                this.v[this.offset + 3] & 63
            );

            this.offset += 4;
            out += String.fromCodePoint(read);

        }

        return out;

    }

    read_u8_str() {

        const len = this.read_u8() + this.offset;
        const out = this.read_str(len);

        return out;

    }

    read_u32_str() {

        const len = this.read_u32() + this.offset;
        const out = this.read_str(len);

        return out;

    }

}

const main = async () => {

    const socket = new WebSocket("ws://127.0.0.1:8085");

    socket.addEventListener("message", msg => {

        if (!(msg.data instanceof ArrayBuffer)) {
            return;
        }

        const parser = new Parser(
            new Uint8Array(msg.data)
        );

        const tid = parser.read_u8();

        switch (tid) {
            case PackSignal.CraftNotify: {

                const id = parser.read_u8_str();
                const message = parser.read_u8_str();
                const is_super = parser.read_u8();

                console.log("Craft", {
                    id,
                    message,
                    is_super
                });

                break;
            }
            case PackSignal.SpawnNotify: {

                const id = parser.read_u8_str();
                const id_mob = parser.read_u8();
                const region = convert_region(parser.read_u8());
                const is_super = parser.read_u8() === 1;

                const len = parser.read_u8();
                const reels = [];

                for (let i = 0; i < len; i++) {

                    const id = parser.read_u8();

                    reels.push(id);

                }

                console.log("Spawn", {
                    id,
                    id_mob,
                    region,
                    is_super,
                    reels // detect multiple spawnable mobs 
                });

                break;

            }
            case PackSignal.DefeatNotify: {

                const id = parser.read_u8_str();
                const id_mob = parser.read_u8();
                const region = convert_region(parser.read_u8());
                const is_super = parser.read_u8() === 1;

                const list = [];
                const len = parser.read_u8();

                for (let i = 0; i < len; i++) {

                    const name = parser.read_u8_str();

                    list.push(name);

                }

                console.log("Defeat", {
                    id,
                    id_mob,
                    region,
                    is_super,
                    list
                });

                break;
            }
            case PackSignal.SummonNotify: {

                const id = parser.read_u8_str();
                const id_mob = parser.read_u8();
                const region = convert_region(parser.read_u8());
                const is_super = parser.read_u8() === 1;

                console.log("Summon", {
                    id,
                    id_mob,
                    region,
                    is_super
                });

                break;

            }
            default:
                break;
        }

    });

};