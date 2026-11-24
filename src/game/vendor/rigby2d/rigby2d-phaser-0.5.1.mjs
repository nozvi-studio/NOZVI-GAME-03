/*! Rigby2D for Phaser 0.5.1 | MIT OR Apache-2.0 | https://rigby2d.com/docs/runtimes.html#phaser */
//#region src/core/atlas.js
var e = (e) => e.split(",").map((e) => Number(e.trim()));
function t(e) {
	let t = e.replace(/^﻿/, "").split(/\r?\n/), i = [], a = null, o = null;
	for (let e of t) {
		let t = e.trim();
		if (!t) {
			a = null, o = null;
			continue;
		}
		let s = t.indexOf(":");
		if (s < 0) {
			a ? (o = {
				name: t,
				index: -1,
				x: 0,
				y: 0,
				width: 0,
				height: 0,
				rotate: 0,
				offsetX: 0,
				offsetY: 0,
				originalWidth: -1,
				originalHeight: -1,
				split: null,
				pad: null,
				extra: {}
			}, a.regions.push(o)) : (a = {
				name: t,
				width: 0,
				height: 0,
				format: "RGBA8888",
				filter: ["Nearest", "Nearest"],
				repeat: "none",
				pma: !1,
				scale: null,
				regions: [],
				extra: {}
			}, i.push(a));
			continue;
		}
		if (!a) continue;
		let c = t.slice(0, s).trim(), l = t.slice(s + 1).trim();
		o ? r(o, c, l) : n(a, c, l);
	}
	for (let e of i) for (let t of e.regions) t.originalWidth < 0 && (t.originalWidth = t.width), t.originalHeight < 0 && (t.originalHeight = t.height);
	return { pages: i };
}
function n(t, n, r) {
	switch (n) {
		case "size":
			[t.width, t.height] = e(r);
			break;
		case "format":
			t.format = r;
			break;
		case "filter":
			t.filter = r.split(",").map((e) => e.trim());
			break;
		case "repeat":
			t.repeat = r;
			break;
		case "pma":
			t.pma = r === "true";
			break;
		case "scale":
			t.scale = Number(r);
			break;
		default: t.extra[n] = r;
	}
}
function r(t, n, r) {
	switch (n) {
		case "bounds":
			[t.x, t.y, t.width, t.height] = e(r);
			break;
		case "offsets":
			[t.offsetX, t.offsetY, t.originalWidth, t.originalHeight] = e(r);
			break;
		case "xy":
			[t.x, t.y] = e(r);
			break;
		case "size":
			[t.width, t.height] = e(r);
			break;
		case "orig":
			[t.originalWidth, t.originalHeight] = e(r);
			break;
		case "offset":
			[t.offsetX, t.offsetY] = e(r);
			break;
		case "rotate":
			t.rotate = r === "true" ? 90 : r === "false" ? 0 : Number(r) || 0;
			break;
		case "index":
			t.index = Number(r);
			break;
		case "split":
			t.split = e(r);
			break;
		case "pad":
			t.pad = e(r);
			break;
		default: t.extra[n] = r;
	}
}
function i(e) {
	let t = Math.abs(e.rotate % 180) === 90;
	return {
		src: {
			x: e.x,
			y: e.y,
			width: t ? e.height : e.width,
			height: t ? e.width : e.height
		},
		dst: {
			x: e.offsetX,
			y: e.originalHeight - e.height - e.offsetY,
			width: e.width,
			height: e.height
		},
		rotate: e.rotate,
		originalWidth: e.originalWidth,
		originalHeight: e.originalHeight
	};
}
//#endregion
//#region src/core/curve.js
var a = "linear", o = "stepped";
Object.freeze({ bezier: Object.freeze([
	.42,
	0,
	.58,
	1
]) }), Object.freeze({ bezier: Object.freeze([
	.42,
	0,
	1,
	1
]) }), Object.freeze({ bezier: Object.freeze([
	0,
	0,
	.58,
	1
]) });
var s = (e) => typeof e == "object" && !!e, c = (e) => Array.isArray(e) && e.length === 4;
function l(e) {
	if (e === "stepped") return o;
	let t = a;
	return s(e) && c(e.bezier) ? t = { bezier: e.bezier.map(Number) } : s(e) && Array.isArray(e.beziers) && e.beziers.length && e.beziers.every(c) && (t = { beziers: e.beziers.map((e) => e.map(Number)) }), t !== "linear" && s(e.src) && (t.src = JSON.parse(JSON.stringify(e.src))), t;
}
function u(e, t = 0) {
	return s(e) ? c(e.bezier) ? e.bezier : Array.isArray(e.beziers) ? e.beziers[t] ?? e.beziers[0] ?? null : null : null;
}
var d = (e) => Math.min(1, Math.max(0, e));
function f(e, t, n = 0) {
	if (t = d(t), e === "stepped") return 0;
	let r = u(e, n);
	return r ? h(r[0], r[1], r[2], r[3], t) : t;
}
function p(e, t, n) {
	let r = 1 - n;
	return 3 * r * r * n * e + 3 * r * n * n * t + n * n * n;
}
function m(e, t, n) {
	let r = 1 - n;
	return 3 * r * r * e + 6 * r * n * (t - e) + 3 * n * n * (1 - t);
}
function h(e, t, n, r, i) {
	e = d(e), n = d(n);
	let a = i;
	for (let o = 0; o < 8; o++) {
		let o = p(e, n, a) - i;
		if (Math.abs(o) < 1e-5) return p(t, r, a);
		let s = m(e, n, a);
		if (Math.abs(s) < 1e-6) break;
		a = d(a - o / s);
	}
	let o = 0, s = 1;
	a = i;
	for (let t = 0; t < 30; t++) {
		let t = p(e, n, a);
		if (Math.abs(t - i) < 1e-5) break;
		t < i ? o = a : s = a, a = (o + s) * .5;
	}
	return p(t, r, a);
}
//#endregion
//#region src/core/math.js
var g = Math.PI / 180;
function _(e, t, n) {
	return e + (t - e) * n;
}
function v(e = 0, t = 0, n = 0) {
	return {
		x: e,
		y: t,
		rotation: n,
		scale_x: 1,
		scale_y: 1,
		shear_x: 0,
		shear_y: 0
	};
}
function y() {
	return v();
}
function b(e, t) {
	return t.x = e.x, t.y = e.y, t.rotation = e.rotation, t.scale_x = e.scale_x, t.scale_y = e.scale_y, t.shear_x = e.shear_x ?? 0, t.shear_y = e.shear_y ?? 0, t;
}
function ee(e) {
	return {
		x: e.x,
		y: e.y,
		rotation: e.rotation,
		scale_x: e.scale_x,
		scale_y: e.scale_y,
		shear_x: e.shear_x ?? 0,
		shear_y: e.shear_y ?? 0
	};
}
function te(e, t = new S()) {
	let n = (e.rotation + (e.shear_x ?? 0)) * g, r = (e.rotation + 90 + (e.shear_y ?? 0)) * g;
	return t.set(Math.cos(n) * e.scale_x, Math.sin(n) * e.scale_x, Math.cos(r) * e.scale_y, Math.sin(r) * e.scale_y, e.x, e.y);
}
function x(e) {
	return e = ((e + 180) % 360 + 360) % 360 - 180, e === -180 ? 180 : e;
}
var S = class e {
	constructor(e = 1, t = 0, n = 0, r = 1, i = 0, a = 0) {
		this.a = e, this.b = t, this.c = n, this.d = r, this.tx = i, this.ty = a;
	}
	static identity() {
		return new e();
	}
	clone() {
		return new e(this.a, this.b, this.c, this.d, this.tx, this.ty);
	}
	set(e, t, n, r, i, a) {
		return this.a = e, this.b = t, this.c = n, this.d = r, this.tx = i, this.ty = a, this;
	}
	static multiply(e, t, n) {
		return n.set(e.a * t.a + e.c * t.b, e.b * t.a + e.d * t.b, e.a * t.c + e.c * t.d, e.b * t.c + e.d * t.d, e.a * t.tx + e.c * t.ty + e.tx, e.b * t.tx + e.d * t.ty + e.ty);
	}
	mul(t) {
		return new e(this.a * t.a + this.c * t.b, this.b * t.a + this.d * t.b, this.a * t.c + this.c * t.d, this.b * t.c + this.d * t.d, this.a * t.tx + this.c * t.ty + this.tx, this.b * t.tx + this.d * t.ty + this.ty);
	}
	determinant() {
		return this.a * this.d - this.b * this.c;
	}
	inverse() {
		let t = this.determinant();
		if (Math.abs(t) < 1e-12) return new e();
		let n = 1 / t, r = this.d * n, i = -this.b * n, a = -this.c * n, o = this.a * n;
		return new e(r, i, a, o, -(r * this.tx + a * this.ty), -(i * this.tx + o * this.ty));
	}
	apply(e) {
		return [this.a * e[0] + this.c * e[1] + this.tx, this.b * e[0] + this.d * e[1] + this.ty];
	}
	applyVector(e) {
		return [this.a * e[0] + this.c * e[1], this.b * e[0] + this.d * e[1]];
	}
	rotation() {
		return Math.atan2(this.b, this.a) / g;
	}
	decompose() {
		let e = Math.hypot(this.a, this.b);
		if (e < 1e-12) return {
			x: this.tx,
			y: this.ty,
			rotation: 0,
			scale_x: 0,
			scale_y: 0,
			shear_x: 0,
			shear_y: 0
		};
		let t = this.rotation(), n = this.determinant(), r = Math.hypot(this.c, this.d) * (n < 0 ? -1 : 1), i = x((r === 0 ? t + 90 : Math.atan2(this.d / r, this.c / r) / g) - t - 90);
		return {
			x: this.tx,
			y: this.ty,
			rotation: t,
			scale_x: e,
			scale_y: r,
			shear_x: 0,
			shear_y: Math.abs(i) < 1e-9 ? 0 : i
		};
	}
}, ne = [
	"rotate",
	"translate",
	"scale",
	"shear"
], re = [
	"translateX",
	"translateY",
	"scaleX",
	"scaleY",
	"shearX",
	"shearY"
], C = [
	...ne,
	...re,
	"inherit"
], w = [
	"attachment",
	"color",
	"rgb",
	"alpha",
	"rgba2",
	"rgb2"
];
function T(e, t, n = a) {
	return {
		time: e,
		value: t,
		curve: n
	};
}
function ie(e) {
	return Array.isArray(e) ? e.slice() : e;
}
function ae(e, t, n, r) {
	return typeof e == "number" ? _(e, t, f(r, n, 0)) : Array.isArray(e) ? e.map((e, i) => _(e, t[i], f(r, n, i))) : e;
}
function E(e, t) {
	if (!e || e.length === 0) return;
	if (t <= e[0].time) return ie(e[0].value);
	let n = ce(e, (e) => e.time <= t);
	if (n >= e.length) return ie(e[e.length - 1].value);
	let r = e[n - 1], i = e[n], a = i.time - r.time, o = a > 0 ? (t - r.time) / a : 1;
	return ae(r.value, i.value, o, r.curve);
}
var oe = (e, t) => Array.isArray(e.value) ? e.value[t] : e.value;
function D(e, t, n = 0) {
	if (t <= e[0].time) return oe(e[0], n);
	let r = ce(e, (e) => e.time <= t);
	if (r >= e.length) return oe(e[e.length - 1], n);
	let i = e[r - 1], a = e[r], o = a.time - i.time, s = oe(i, n);
	return s + (oe(a, n) - s) * f(i.curve, o > 0 ? (t - i.time) / o : 1, n);
}
function se(e, t) {
	return ce(e, (e) => e.time <= t) - 1;
}
function ce(e, t) {
	let n = 0, r = e.length;
	for (; n < r;) {
		let i = n + r >> 1;
		t(e[i]) ? n = i + 1 : r = i;
	}
	return n;
}
function le(e) {
	let t = { bone: e };
	for (let e of C) t[e] = [];
	return t;
}
function ue(e) {
	let t = { slot: e };
	for (let e of w) t[e] = [];
	return t;
}
var de = class {
	constructor(e = "", t = 0) {
		this.name = e, this.duration = t, this.bones = [], this.slots = [], this.deform = [], this.drawOrder = [], this.events = [], this.ik = [], this.extra = {};
	}
	boneTimeline(e) {
		return this.bones.find((t) => t.bone === e);
	}
	boneTimelineMut(e) {
		let t = this.boneTimeline(e);
		return t || (t = le(e), this.bones.push(t)), t;
	}
	slotTimeline(e) {
		return this.slots.find((t) => t.slot === e);
	}
	slotTimelineMut(e) {
		let t = this.slotTimeline(e);
		return t || (t = ue(e), this.slots.push(t)), t;
	}
	prune() {
		this.bones = this.bones.filter((e) => C.some((t) => e[t].length)), this.slots = this.slots.filter((e) => w.some((t) => e[t].length)), this.deform = this.deform.filter((e) => e.keys.length), this.ik = this.ik.filter((e) => e.keys.length);
	}
	lastKeyTime() {
		let e = 0, t = (t) => {
			for (let n of t) e = Math.max(e, n.time);
		};
		for (let e of this.bones) for (let n of C) t(e[n]);
		for (let e of this.slots) for (let n of w) t(e[n]);
		for (let e of this.deform) t(e.keys);
		for (let e of this.ik) t(e.keys);
		return t(this.drawOrder), t(this.events), e;
	}
};
//#endregion
//#region src/core/clipping.js
function fe(e) {
	let t = 0;
	for (let n = 0, r = e.length; n < r; n += 2) {
		let i = (n + 2) % r;
		t += e[n] * e[i + 1] - e[i] * e[n + 1];
	}
	return t / 2;
}
function pe(e) {
	let t = e.slice();
	if (fe(t) < 0) {
		let e = [];
		for (let n = t.length - 2; n >= 0; n -= 2) e.push(t[n], t[n + 1]);
		t = e;
	}
	let n = [];
	for (let e = 0; e < t.length / 2; e++) n.push(e);
	let r = (e) => t[2 * e], i = (e) => t[2 * e + 1], a = (e, t, n) => (r(t) - r(e)) * (i(n) - i(e)) - (i(t) - i(e)) * (r(n) - r(e)), o = (e, t, n, r) => a(e, t, r) >= 0 && a(t, n, r) >= 0 && a(n, e, r) >= 0, s = [], c = 0;
	for (; n.length > 3 && c++ < 1e4;) {
		let e = !1;
		for (let t = 0; t < n.length; t++) {
			let c = n[(t + n.length - 1) % n.length], l = n[t], u = n[(t + 1) % n.length];
			if (!(a(c, l, u) <= 0) && !n.some((e) => e !== c && e !== l && e !== u && o(c, l, u, e))) {
				s.push([
					r(c),
					i(c),
					r(l),
					i(l),
					r(u),
					i(u)
				]), n.splice(t, 1), e = !0;
				break;
			}
		}
		if (!e) break;
	}
	return n.length === 3 && s.push(n.flatMap((e) => [r(e), i(e)])), s;
}
function me(e, t) {
	let n = e;
	for (let e = 0; e < 3 && n.length; e++) {
		let r = t[2 * e], i = t[2 * e + 1], a = t[(2 * e + 2) % 6], o = t[(2 * e + 3) % 6], s = (e) => (a - r) * (e.y - i) - (o - i) * (e.x - r), c = n;
		n = [];
		for (let e = 0; e < c.length; e++) {
			let t = c[e], r = c[(e + 1) % c.length], i = s(t), a = s(r);
			if (i >= 0 && n.push(t), i >= 0 != a >= 0) {
				let e = i / (i - a);
				n.push({
					x: t.x + (r.x - t.x) * e,
					y: t.y + (r.y - t.y) * e,
					u: t.u + (r.u - t.u) * e,
					v: t.v + (r.v - t.v) * e
				});
			}
		}
	}
	return n;
}
var he = class {
	constructor(e) {
		this.triangles = pe(e);
	}
	clip(e, t, n, r) {
		let i = [], a = [], o = [], s = (n) => ({
			x: e[2 * n],
			y: e[2 * n + 1],
			u: t[2 * n],
			v: t[2 * n + 1]
		});
		for (let e = 0; e + 2 < n.length; e += 3) {
			let t = [
				s(n[e]),
				s(n[e + 1]),
				s(n[e + 2])
			];
			(t[1].x - t[0].x) * (t[2].y - t[0].y) - (t[1].y - t[0].y) * (t[2].x - t[0].x) < 0 && (t = [
				t[0],
				t[2],
				t[1]
			]);
			for (let e of this.triangles) {
				let n = me(t, e);
				if (n.length < 3) continue;
				let r = i.length / 2;
				for (let e of n) i.push(e.x, e.y), a.push(e.u, e.v);
				for (let e = 1; e + 1 < n.length; e++) o.push(r, r + e, r + e + 1);
			}
		}
		o.length && r(i, a, o);
	}
}, O = Math.PI / 180, k = 1e-5, A = [
	"rotate",
	"x",
	"y",
	"scaleX",
	"scaleY",
	"shearY"
], ge = {
	rotate: "rotation",
	x: "x",
	y: "y",
	scaleX: "scaleX",
	scaleY: "scaleY",
	shearY: "shearY"
}, _e = /* @__PURE__ */ new WeakMap();
function ve(e) {
	let t = _e.get(e);
	if (t && be(t.signature, e)) return t.list;
	let n = ye(e), r = xe(e);
	return _e.set(e, {
		signature: n,
		list: r
	}), r;
}
function ye(e) {
	let t = e.extra ?? {};
	return [
		t.constraints,
		t.transform,
		t.path,
		e.bones.length,
		e.slots.length
	];
}
function be(e, t) {
	let n = t.extra ?? {};
	return e[0] === n.constraints && e[1] === n.transform && e[2] === n.path && e[3] === t.bones.length && e[4] === t.slots.length;
}
function xe(e) {
	let t = new Map(e.bones.map((e, t) => [e.name, t])), n = new Map(e.slots.map((e, t) => [e.name, t])), r = [];
	for (let t of e.extra?.constraints ?? []) r.push({
		data: t.data,
		type: t.data.type,
		order: t.index
	});
	for (let t of [
		"transform",
		"path",
		"physics"
	]) (e.extra?.[t] ?? []).forEach((e, n) => r.push({
		data: e,
		type: t,
		order: e.order ?? n
	}));
	let i = [];
	for (let { data: a, type: o, order: s } of r) {
		if (o === "slider") {
			let n = e.animations.findIndex((e) => e.name === a.animation), r = a.bone === void 0 ? null : t.get(a.bone);
			if (n < 0 || r === void 0) continue;
			i.push({
				name: a.name,
				order: s,
				skinRequired: !!a.skin,
				bones: r === null ? [] : [r],
				type: o,
				animation: n,
				bone: r,
				property: a.property ?? "rotate",
				scale: a.scale ?? 1,
				offset: a.offset ?? 0,
				local: !!a.local,
				loop: !!a.loop,
				additive: !!a.additive,
				setup: {
					time: a.time ?? 0,
					mix: a.mix ?? 1
				}
			});
			continue;
		}
		if (o === "physics") {
			let e = t.get(a.bone);
			if (e === void 0) continue;
			i.push({
				name: a.name,
				order: s,
				skinRequired: !!a.skin,
				bones: [e],
				type: o,
				bone: e,
				...Ce(a)
			});
			continue;
		}
		let r = (a.bones ?? []).map((e) => t.get(e));
		if (!r.length || r.some((e) => e === void 0)) continue;
		let c = {
			name: a.name,
			order: s,
			skinRequired: !!a.skin,
			bones: r
		};
		if (o === "transform") {
			let e = t.get(a.source ?? a.target);
			if (e === void 0) continue;
			i.push({
				...c,
				type: o,
				source: e,
				...we(a)
			});
		} else if (o === "path") {
			let e = n.get(a.slot ?? a.target);
			if (e === void 0) continue;
			i.push({
				...c,
				type: o,
				slot: e,
				...Te(a)
			});
		}
	}
	return i;
}
var Se = [
	"inertia",
	"strength",
	"damping",
	"mass",
	"wind",
	"gravity",
	"mix"
];
function Ce(e) {
	let t = {};
	for (let n of Se) t[n] = !!e[`${n}Global`];
	return {
		weights: {
			x: e.x ?? 0,
			y: e.y ?? 0,
			rotate: e.rotate ?? 0,
			scaleX: e.scaleX ?? 0,
			shearX: e.shearX ?? 0
		},
		limit: e.limit ?? 5e3,
		fps: e.fps ?? 60,
		globals: t,
		setup: {
			inertia: e.inertia ?? .5,
			strength: e.strength ?? 100,
			damping: e.damping ?? .85,
			mass: e.mass ?? 1,
			wind: e.wind ?? 0,
			gravity: e.gravity ?? 0,
			mix: e.mix ?? 1
		}
	};
}
function we(e) {
	let t = e.rotateMix !== void 0 || e.translateMix !== void 0 || e.scaleMix !== void 0 || e.shearMix !== void 0, n = {};
	for (let t of A) n[t] = e[ge[t]] ?? 0;
	let r;
	if (t) {
		let t = e.translateMix ?? 1, n = e.scaleMix ?? 1;
		r = {
			rotate: e.rotateMix ?? 1,
			x: t,
			y: t,
			scaleX: n,
			scaleY: n,
			shearY: e.shearMix ?? 1
		};
	} else {
		let t = e.mixX ?? 1, n = e.mixScaleX ?? 1;
		r = {
			rotate: e.mixRotate ?? 1,
			x: t,
			y: e.mixY ?? t,
			scaleX: n,
			scaleY: e.mixScaleY ?? n,
			shearY: e.mixShearY ?? 1
		};
	}
	let i;
	i = e.properties ? Object.entries(e.properties).filter(([e]) => A.includes(e)).map(([e, t]) => ({
		from: e,
		offset: t.offset ?? 0,
		to: Object.entries(t.to ?? {}).filter(([e]) => A.includes(e)).map(([e, t]) => ({
			prop: e,
			offset: t.offset ?? 0,
			max: t.max ?? 1,
			scale: t.scale ?? 1
		}))
	})) : A.map((e) => ({
		from: e,
		offset: 0,
		to: [{
			prop: e,
			offset: 0,
			max: 1,
			scale: 1
		}]
	}));
	let a = !!e.local;
	return {
		offsets: n,
		mix: r,
		props: i,
		localSource: e.localSource ?? a,
		localTarget: e.localTarget ?? a,
		additive: !!(e.additive ?? e.relative),
		clamp: !!e.clamp
	};
}
function Te(e) {
	let t = e.rotateMix !== void 0 || e.translateMix !== void 0, n = t ? e.translateMix ?? 1 : e.mixX ?? 1;
	return {
		positionMode: e.positionMode ?? "percent",
		spacingMode: e.spacingMode ?? "length",
		rotateMode: e.rotateMode ?? "tangent",
		offsetRotation: e.rotation ?? 0,
		setup: {
			position: e.position ?? 0,
			spacing: e.spacing ?? 0,
			mixRotate: t ? e.rotateMix ?? 1 : e.mixRotate ?? 1,
			mixX: n,
			mixY: t ? n : e.mixY ?? n
		}
	};
}
function Ee(e) {
	return e.map((e) => e.type === "transform" ? { mix: { ...e.mix } } : { ...e.setup });
}
function De(e, t) {
	e.forEach((e, n) => {
		e.type === "transform" ? Object.assign(t[n].mix, e.mix) : Object.assign(t[n], e.setup);
	});
}
function Oe(e, t) {
	if (!t.skinRequired) return !0;
	let n = e.skin ? e.findSkin(e.skin) : null;
	if (!n) return !1;
	let r = n.extra ?? {};
	return [
		r.constraints,
		r.transform,
		r.path,
		r.physics
	].some((e) => Array.isArray(e) && e.includes(t.name));
}
function ke(e, t, n, r, i) {
	let a = n.extra ?? {};
	(a.transform || a.path || a.physics || a.slider) && e.forEach((e, n) => {
		let o = t[n];
		if (e.type === "transform") {
			let t = a.transform?.[e.name];
			if (!Array.isArray(t) || !t.length) return;
			let n = t.some((e) => e.rotateMix !== void 0 || e.translateMix !== void 0 || e.scaleMix !== void 0 || e.shearMix !== void 0) ? j(t, r, (e) => {
				let t = e.translateMix ?? 1, n = e.scaleMix ?? 1;
				return [
					e.rotateMix ?? 1,
					t,
					t,
					n,
					n,
					e.shearMix ?? 1
				];
			}) : j(t, r, (e) => {
				let t = e.mixX ?? 1, n = e.mixScaleX ?? 1;
				return [
					e.mixRotate ?? 1,
					t,
					e.mixY ?? t,
					n,
					e.mixScaleY ?? n,
					e.mixShearY ?? 1
				];
			});
			A.forEach((e, t) => o.mix[e] += (n[t] - o.mix[e]) * i);
		} else if (e.type === "slider") {
			let t = a.slider?.[e.name];
			if (!t) return;
			for (let e of ["time", "mix"]) {
				if (!Array.isArray(t[e]) || !t[e].length) continue;
				let [n] = j(t[e], r, (t) => [t.value ?? +(e === "mix")]);
				o[e] += (n - o[e]) * i;
			}
		} else if (e.type === "physics") {
			for (let [t, n] of [[a.physics?.[e.name], !1], [a.physics?.[""], !0]]) if (t) for (let a of Se) {
				let s = t[a];
				if (!Array.isArray(s) || !s.length || n && !e.globals[a]) continue;
				let [c] = j(s, r, (e) => [e.value ?? 0]);
				o[a] += (c - o[a]) * i;
			}
		} else if (e.type === "path") {
			let t = a.path?.[e.name];
			if (!t) return;
			if (t.position?.length) {
				let [e] = j(t.position, r, (e) => [e.value ?? e.position ?? 0]);
				o.position += (e - o.position) * i;
			}
			if (t.spacing?.length) {
				let [e] = j(t.spacing, r, (e) => [e.value ?? e.spacing ?? 0]);
				o.spacing += (e - o.spacing) * i;
			}
			if (t.mix?.length) {
				let [e, n, a] = j(t.mix, r, (e) => e.rotateMix !== void 0 || e.translateMix !== void 0 ? [
					e.rotateMix ?? 1,
					e.translateMix ?? 1,
					e.translateMix ?? 1
				] : [
					e.mixRotate ?? 1,
					e.mixX ?? 1,
					e.mixY ?? e.mixX ?? 1
				]);
				o.mixRotate += (e - o.mixRotate) * i, o.mixX += (n - o.mixX) * i, o.mixY += (a - o.mixY) * i;
			}
		}
	});
}
function j(e, t, n) {
	if (t < (e[0].time ?? 0)) return n(e[0]);
	let r = 0;
	for (; r + 1 < e.length && (e[r + 1].time ?? 0) <= t;) r++;
	let i = e[r], a = e[r + 1], o = n(i);
	if (!a || i.curve === "stepped") return o;
	let s = n(a), c = i.time ?? 0, l = a.time ?? 0;
	if (l <= c) return s;
	let u = i.curve;
	return o.map((e, n) => {
		let r = s[n];
		if (Array.isArray(u) && u.length >= 4 * (n + 1) && u.length >= 4 * o.length) return Ae(c, e, u[4 * n], u[4 * n + 1], u[4 * n + 2], u[4 * n + 3], l, r, t);
		let a = (t - c) / (l - c);
		return typeof u == "number" ? a = je(u, i.c2 ?? 0, i.c3 ?? 1, i.c4 ?? 1, a) : Array.isArray(u) && u.length === 4 && (a = je(u[0], u[1], u[2], u[3], a)), e + (r - e) * a;
	});
}
function M(e, t, n, r, i) {
	let a = 1 - i;
	return a * a * a * e + 3 * a * a * i * t + 3 * a * i * i * n + i * i * i * r;
}
function Ae(e, t, n, r, i, a, o, s, c) {
	let l = 0, u = 1, d = (c - e) / (o - e);
	for (let t = 0; t < 40; t++) {
		let t = M(e, n, i, o, d);
		if (Math.abs(t - c) < 1e-7) break;
		t < c ? l = d : u = d, d = (l + u) / 2;
	}
	return M(t, r, a, s, d);
}
function je(e, t, n, r, i) {
	return Ae(0, 0, e, t, n, r, 1, 1, i);
}
function Me(e, t) {
	if (!t) return;
	let n = Math.cos(t * O), r = Math.sin(t * O), { a: i, b: a, c: o, d: s } = e;
	e.a = n * i - r * a, e.b = r * i + n * a, e.c = n * o - r * s, e.d = r * o + n * s;
}
var N = (e, t) => Math.atan2(t, e) / O;
function Ne(e, t) {
	if (t.localSource) {
		let n = e.applied[t.source];
		return {
			rotate: n.rotation,
			x: n.x,
			y: n.y,
			scaleX: n.scale_x,
			scaleY: n.scale_y,
			shearY: n.shear_y ?? 0
		};
	}
	let n = e.world[t.source], [r, i] = n.apply([t.offsets.x, t.offsets.y]), a = N(n.a, n.b);
	return {
		rotate: a,
		x: r,
		y: i,
		scaleX: Math.hypot(n.a, n.b),
		scaleY: Math.hypot(n.c, n.d),
		shearY: x(N(n.c, n.d) - a - 90)
	};
}
function Pe(e, t) {
	let n = Ne(e, t), r = !t.localSource && e.world[t.source].determinant() < 0, i = {};
	for (let e of t.props) {
		let a = n[e.from] - e.offset;
		for (let n of e.to) {
			let o = a * n.scale + n.offset;
			t.clamp && (o = Math.min(Math.max(o, Math.min(n.offset, n.max)), Math.max(n.offset, n.max)));
			let s = !t.localSource && (n.prop === "x" || n.prop === "y") && (e.from === "x" || e.from === "y") ? 0 : t.offsets[n.prop];
			r && (n.prop === "rotate" || n.prop === "shearY") && (s = -s), i[n.prop] = (i[n.prop] ?? 0) + o + s;
		}
	}
	return i;
}
function Fe(e, t, n) {
	let r = n.mix;
	if (!A.some((e) => r[e] !== 0)) return null;
	let i = Pe(e, t);
	if (t.localTarget) {
		for (let n of t.bones) {
			let a = e.applied[n], o = (e) => i[e] === void 0 ? 0 : r[e];
			t.additive ? (o("rotate") && (a.rotation += i.rotate * r.rotate), o("x") && (a.x += i.x * r.x), o("y") && (a.y += i.y * r.y), o("scaleX") && (a.scale_x *= (i.scaleX - 1) * r.scaleX + 1), o("scaleY") && (a.scale_y *= (i.scaleY - 1) * r.scaleY + 1), o("shearY") && (a.shear_y = (a.shear_y ?? 0) + i.shearY * r.shearY)) : (o("rotate") && (a.rotation += x(i.rotate - a.rotation) * r.rotate), o("x") && (a.x += (i.x - a.x) * r.x), o("y") && (a.y += (i.y - a.y) * r.y), o("scaleX") && (a.scale_x += (i.scaleX - a.scale_x) * r.scaleX), o("scaleY") && (a.scale_y += (i.scaleY - a.scale_y) * r.scaleY), o("shearY") && (a.shear_y = (a.shear_y ?? 0) + x(i.shearY - (a.shear_y ?? 0)) * r.shearY));
		}
		return { local: t.bones };
	}
	let a = /* @__PURE__ */ new Map();
	for (let n of t.bones) {
		let o = e.world[n].clone();
		i.rotate !== void 0 && r.rotate && Me(o, (t.additive ? i.rotate : x(i.rotate - N(o.a, o.b))) * r.rotate), i.x !== void 0 && r.x && (o.tx += t.additive ? i.x * r.x : (i.x - o.tx) * r.x), i.y !== void 0 && r.y && (o.ty += t.additive ? i.y * r.y : (i.y - o.ty) * r.y);
		let s = (e, n, r, i) => {
			let a = Math.hypot(o[r], o[i]);
			if (a < k) return;
			let s = t.additive ? (e - 1) * n + 1 : (a + (e - a) * n) / a;
			o[r] *= s, o[i] *= s;
		};
		if (i.scaleX !== void 0 && r.scaleX && s(i.scaleX, r.scaleX, "a", "b"), i.scaleY !== void 0 && r.scaleY && s(i.scaleY, r.scaleY, "c", "d"), i.shearY !== void 0 && r.shearY) {
			let e = N(o.a, o.b), n = x(N(o.c, o.d) - e), a = t.additive ? n + i.shearY * r.shearY : n + x(90 + i.shearY - n) * r.shearY, s = Math.hypot(o.c, o.d);
			o.c = Math.cos((e + a) * O) * s, o.d = Math.sin((e + a) * O) * s;
		}
		a.set(n, o);
	}
	return { world: a };
}
function Ie(e, t, n, r) {
	let { mixRotate: i, mixX: a, mixY: o } = r;
	if (i === 0 && a === 0 && o === 0) return null;
	let s = t.slotAttachment(e, n.slot);
	if (!s || s.type !== "path") return null;
	let c = Le(t.worldVertices(e, n.slot, s), s);
	if (!c) return null;
	let l = n.bones.length, u = n.rotateMode === "tangent", d = n.rotateMode === "chainScale", f = u ? l : l + 1, p = n.bones.map((n) => e.bones[n].length * Math.hypot(t.world[n].a, t.world[n].b)), m = Array(f).fill(0), h = n.spacingMode === "percent";
	for (let e = 0; e < f - 1; e++) {
		let t = p[e];
		switch (n.spacingMode) {
			case "percent":
			case "fixed":
				m[e + 1] = r.spacing;
				break;
			case "proportional":
				m[e + 1] = t;
				break;
			default: m[e + 1] = t < k ? 0 : t + r.spacing;
		}
	}
	if (n.spacingMode === "proportional") {
		let e = m.reduce((e, t) => e + t, 0);
		if (e > k) for (let t = 1; t < f; t++) m[t] *= c.length * (1 - Math.min(1, r.spacing)) / e;
	}
	let g = r.position;
	n.positionMode === "percent" && (g *= c.length);
	let _ = [], v = g;
	for (let e = 0; e < f; e++) v += h ? m[e] * c.length : m[e], _.push(c.at(v));
	let y = /* @__PURE__ */ new Map(), b = (e) => e.determinant() < 0 ? -1 : 1;
	for (let e = 0; e < l; e++) {
		let r = n.bones[e], s = t.world[r].clone(), [c, l, f] = _[e];
		if (s.tx += (c - s.tx) * a, s.ty += (l - s.ty) * o, i > 0) {
			let t;
			if (u) t = f;
			else {
				let [n, r] = _[e + 1], a = n - s.tx, o = r - s.ty;
				if (d && p[e] >= k) {
					let t = (Math.hypot(a, o) / p[e] - 1) * i + 1;
					s.a *= t, s.b *= t;
				}
				t = Math.hypot(a, o) > k ? N(a, o) : f;
			}
			t = x(t - N(s.a, s.b) + n.offsetRotation * b(s)), Me(s, t * i);
		}
		y.set(r, s);
	}
	return { world: y };
}
function Le(e, t) {
	let n = Math.floor(e.length / 6);
	if (n < 2 && !(t.closed && n >= 1)) return null;
	let r = [], i = t.closed ? n : n - 1;
	for (let a = 0; a < i; a++) {
		let i = 6 * a, o = t.closed && a === n - 1 ? 0 : i + 6;
		r.push([
			e[i + 2],
			e[i + 3],
			e[i + 4],
			e[i + 5],
			e[o],
			e[o + 1],
			e[o + 2],
			e[o + 3]
		]);
	}
	let a = r.map((e) => {
		let t = [0], [n, r] = [e[0], e[1]];
		for (let i = 1; i <= 16; i++) {
			let a = i / 16, o = M(e[0], e[2], e[4], e[6], a), s = M(e[1], e[3], e[5], e[7], a);
			t.push(t[i - 1] + Math.hypot(o - n, s - r)), [n, r] = [o, s];
		}
		return t;
	}), o = [];
	if (t.constantSpeed || !t.lengths?.length) {
		let e = 0;
		for (let t of a) o.push(e += t[16]);
	} else for (let e = 0; e < i; e++) o.push(t.lengths[e] ?? o[e - 1] ?? 0);
	let s = o[o.length - 1] ?? 0;
	if (s < k) return null;
	let c = (e, t) => {
		let n = r[e], i = M(n[0], n[2], n[4], n[6], t), a = M(n[1], n[3], n[5], n[7], t), o = (e, n, r, i) => 3 * (1 - t) * (1 - t) * (n - e) + 6 * (1 - t) * t * (r - n) + 3 * t * t * (i - r), s = o(n[0], n[2], n[4], n[6]), c = o(n[1], n[3], n[5], n[7]);
		return Math.hypot(s, c) < k && ([s, c] = [n[6] - n[0], n[7] - n[1]]), [
			i,
			a,
			N(s, c)
		];
	};
	return {
		length: s,
		at: (e) => {
			if (t.closed) e %= s, e < 0 && (e += s);
			else if (e < 0) {
				let t = r[0], n = N(t[2] - t[0], t[3] - t[1]);
				return [
					t[0] + Math.cos(n * O) * e,
					t[1] + Math.sin(n * O) * e,
					n
				];
			} else if (e > s) {
				let t = r[r.length - 1], n = N(t[6] - t[4], t[7] - t[5]), i = e - s;
				return [
					t[6] + Math.cos(n * O) * i,
					t[7] + Math.sin(n * O) * i,
					n
				];
			}
			let n = 0;
			for (; n < o.length - 1 && e > o[n];) n++;
			let i = n > 0 ? o[n - 1] : 0, l = o[n] - i, u = l > k ? (e - i) / l : 0;
			if (!t.constantSpeed && t.lengths?.length) return c(n, u);
			let d = a[n], f = u * d[16], p = 1;
			for (; p < 16 && d[p] < f;) p++;
			let m = d[p] - d[p - 1], h = (p - 1 + (m > k ? (f - d[p - 1]) / m : 0)) / 16;
			return c(n, h);
		}
	};
}
var Re = 100, ze = 10;
function Be(e, t, n, r, i, a) {
	let o = n.weights, s = r.mix, c = t.world[n.bone], l = t.placement && Math.sqrt(Math.abs(t.placement.determinant())) || 1, u = Math.hypot(c.a, c.b) || 1, d = Math.max(ze, e.bones[n.bone].length * u / l), f = [c.tx / l, c.ty / l], p = [f[0] + c.a / u * d, f[1] + c.b / u * d];
	if (i.ready || Object.assign(i, {
		ready: !0,
		rest: 0,
		o: [0, 0],
		ov: [0, 0],
		t: [0, 0],
		tv: [0, 0],
		lastOrigin: f,
		lastTip: p
	}), a > 0) {
		let e = 1 / Math.max(1, n.fps);
		i.rest += a;
		let t = Math.floor(i.rest / e);
		if (i.rest -= t * e, t = Math.min(t, Math.max(1, n.fps)), t > 0) {
			for (let e = 0; e < 2; e++) i.o[e] -= (f[e] - i.lastOrigin[e]) * r.inertia, i.t[e] -= (p[e] - i.lastTip[e]) * r.inertia;
			let a = r.mass > 0 ? 1 / r.mass : 1, o = Math.min(1, Math.max(0, r.damping)) ** (60 * e), s = [r.wind * Re, -r.gravity * Re];
			for (let c = 0; c < t; c++) for (let [t, c] of [[i.o, i.ov], [i.t, i.tv]]) {
				for (let n = 0; n < 2; n++) c[n] = (c[n] + (s[n] - r.strength * t[n]) * a * e) * o;
				let i = Math.hypot(c[0], c[1]);
				i > n.limit && (c[0] *= n.limit / i, c[1] *= n.limit / i), t[0] += c[0] * e, t[1] += c[1] * e;
			}
			i.lastOrigin = f, i.lastTip = p;
		}
	}
	if (s === 0) return null;
	let m = c.clone();
	if (m.tx += i.o[0] * o.x * s * l, m.ty += i.o[1] * o.y * s * l, o.rotate || o.scaleX || o.shearX) {
		let e = [p[0] - f[0], p[1] - f[1]], t = [e[0] + i.t[0], e[1] + i.t[1]], n = x(N(t[0], t[1]) - N(e[0], e[1]));
		if (Me(m, n * o.rotate * s), o.shearX) {
			let e = n * o.shearX * s * O, [t, r] = [m.a, m.b];
			m.a = t * Math.cos(e) - r * Math.sin(e), m.b = t * Math.sin(e) + r * Math.cos(e);
		}
		if (o.scaleX) {
			let e = (Math.hypot(t[0], t[1]) / d - 1) * o.scaleX * s + 1;
			m.a *= e, m.b *= e;
		}
	}
	return { world: /* @__PURE__ */ new Map([[n.bone, m]]) };
}
function Ve(e, t, n, r) {
	let i = e.animations[n.animation];
	if (!i || r.mix <= 0) return null;
	let a = r.time;
	n.bone !== null && (a = (n.local ? He(t.applied[n.bone], n.property) : Ue(t.world[n.bone], n.property)) * n.scale + n.offset);
	let o = i.duration;
	o > 0 && (a = n.loop ? (a % o + o) % o : Math.min(o, Math.max(0, a)));
	let s = t.local;
	t.local = t.applied;
	try {
		t.apply(e, i, a, Math.min(1, r.mix));
	} finally {
		t.local = s;
	}
	return { all: !0 };
}
function He(e, t) {
	switch (t) {
		case "x": return e.x;
		case "y": return e.y;
		case "scaleX": return e.scale_x;
		case "scaleY": return e.scale_y;
		case "shearY": return e.shear_y ?? 0;
		default: return e.rotation;
	}
}
function Ue(e, t) {
	switch (t) {
		case "x": return e.tx;
		case "y": return e.ty;
		case "scaleX": return Math.hypot(e.a, e.b);
		case "scaleY": return Math.hypot(e.c, e.d);
		case "shearY": return x(N(e.c, e.d) - N(e.a, e.b) - 90);
		default: return N(e.a, e.b);
	}
}
//#endregion
//#region src/core/sequence.js
function We(e, t) {
	let n = e.sequence, r = n.start ?? 1, i = n.digits ?? 0, a = Math.max(1, n.count ?? 1), o = Math.min(a - 1, Math.max(0, t | 0));
	return `${e.image ?? e.name}${String(r + o).padStart(i, "0")}`;
}
function Ge(e) {
	return e.sequence?.setup ?? 0;
}
function Ke(e, t, n) {
	let r = -1, i = 0;
	for (let n = 0; n < e.length && (e[n].time ?? 0) <= t; n++) r = n, i = e[n].delay ?? i;
	if (r < 0) return null;
	let a = e[r], o = a.mode ?? "hold", s = a.index ?? 0;
	if (o === "hold" || n <= 1) return Math.min(n - 1, Math.max(0, s));
	let c = i > 0 ? Math.floor((t - (a.time ?? 0)) / i + 1e-6) : 0, l = o.endsWith("Reverse"), u = o.replace("Reverse", ""), d = s + c;
	if (u === "once") d = Math.min(d, n - 1);
	else if (u === "loop") d %= n;
	else if (u === "pingpong") {
		let e = 2 * (n - 1);
		d %= e, d >= n && (d = e - d);
	}
	return l ? n - 1 - d : d;
}
//#endregion
//#region src/core/constraintdata.js
var qe = [
	"transform",
	"path",
	"physics"
];
function Je(e) {
	let t = e.ik.map((e, t) => ({
		type: "ik",
		name: e.name,
		order: e.order ?? t,
		ik: t
	}));
	for (let n of e.extra?.constraints ?? []) t.push({
		type: n.data.type,
		name: n.data.name,
		order: n.index,
		data: n.data,
		entry: n
	});
	for (let n of qe) (e.extra?.[n] ?? []).forEach((e, r) => t.push({
		type: n,
		name: e.name,
		order: e.order ?? r,
		data: e,
		legacy: n
	}));
	return t.sort((e, t) => e.order - t.order);
}
function Ye(e, t, n) {
	t.type === "ik" ? e.ik[t.ik].order = n : t.entry ? t.entry.index = n : t.data.order = n;
}
function Xe(e) {
	Je(e).forEach((t, n) => Ye(e, t, n));
}
function Ze(e, t) {
	let n = Je(e).find((e) => e.name === t);
	if (!n) return !1;
	if (n.type === "ik") {
		e.ik.splice(n.ik, 1);
		for (let t of e.animations) {
			t.ik = t.ik.filter((e) => e.constraint !== n.ik);
			for (let e of t.ik) e.constraint > n.ik && e.constraint--;
		}
		for (let t of e.skins) t.ik = t.ik.filter((e) => e !== n.ik).map((e) => e > n.ik ? e - 1 : e);
	} else {
		n.entry ? e.extra.constraints.splice(e.extra.constraints.indexOf(n.entry), 1) : e.extra[n.legacy].splice(e.extra[n.legacy].indexOf(n.data), 1);
		for (let r of e.animations) r.extra?.[n.type] && delete r.extra[n.type][t];
		for (let n of e.skins) for (let e of ["constraints", ...qe]) Qe(n.extra?.[e], t);
	}
	return Xe(e), !0;
}
function Qe(e, t) {
	if (!Array.isArray(e)) return;
	let n = e.indexOf(t);
	n >= 0 && e.splice(n, 1);
}
function $e(e) {
	return Je(e).filter((e) => e.type !== "ik").map((e) => ({
		...e,
		path: e.type === "path"
	}));
}
function et(e) {
	let t = new Set(e.bones.map((e) => e.name)), n = new Set(e.slots.map((e) => e.name)), r = [];
	for (let i of $e(e)) {
		let e = i.data, a = [...e.bones ?? [], ...["bone", "source"].map((t) => e[t]).filter((e) => e !== void 0)];
		!i.path && e.target !== void 0 && a.push(e.target);
		let o = i.path ? [e.slot ?? e.target].filter((e) => e !== void 0) : [], s = a.some((e) => !t.has(e)), c = Array.isArray(e.bones) && e.bones.length === 0 && i.type !== "slider" && i.type !== "physics";
		(s || c || o.some((e) => !n.has(e))) && r.push(i.name);
	}
	for (let t of r) Ze(e, t);
	return r;
}
//#endregion
//#region src/core/poses.js
var tt = [
	"x",
	"y",
	"rotation",
	"scale_x",
	"scale_y",
	"shear_x",
	"shear_y"
];
function nt(e) {
	return Array.isArray(e) ? e.filter((e) => e && typeof e.name == "string").map((e) => ({
		name: e.name,
		bones: Object.fromEntries(Object.entries(e.bones ?? {}).filter(([, e]) => e && typeof e == "object").map(([e, t]) => [e, Object.fromEntries(tt.map((e) => [e, typeof t[e] == "number" && Number.isFinite(t[e]) ? t[e] : +!!e.startsWith("scale")]))])),
		slots: Object.fromEntries(Object.entries(e.slots ?? {}).map(([e, t]) => [e, typeof t == "string" ? t : null]))
	})) : [];
}
function rt(e) {
	return Array.isArray(e) ? e.filter((e) => e && typeof e.name == "string" && typeof e.to == "string").map((e) => ({
		name: e.name,
		from: typeof e.from == "string" ? e.from : null,
		to: e.to,
		value: typeof e.value == "number" ? Math.min(1, Math.max(0, e.value)) : 0
	})) : [];
}
//#endregion
//#region src/core/scene.js
var it = 1e3;
function at(e) {
	if (!e || typeof e.animation != "string" || !e.animation) return null;
	let t = (e, t, n = -Infinity) => typeof e == "number" && Number.isFinite(e) && e >= n ? e : t;
	return {
		animation: e.animation,
		start: t(e.start, 0, 0),
		in: t(e.in, 0, 0),
		out: e.out === null || e.out === void 0 ? null : t(e.out, null, 0),
		speed: t(e.speed, 1, .01),
		loops: Math.round(t(e.loops, 1, 0)),
		blend: t(e.blend, .2, 0)
	};
}
function ot(e) {
	if (!e || typeof e != "object") return null;
	let t = (Array.isArray(e.actors) ? e.actors : []).filter((e) => e && typeof e.id == "string" && typeof e.name == "string" && typeof e.bone == "string" && typeof e.slot == "string").map((e) => ({
		id: e.id,
		name: e.name,
		bone: e.bone,
		slot: e.slot,
		source: typeof e.source == "string" ? e.source : null,
		skin: typeof e.skin == "string" && e.skin ? e.skin : null,
		flip: !!e.flip,
		ground: typeof e.ground == "number" && Number.isFinite(e.ground) ? e.ground : 0,
		clips: Object.fromEntries(Object.entries(e.clips && typeof e.clips == "object" ? e.clips : {}).map(([e, t]) => [e, (Array.isArray(t) ? t : []).map(at).filter(Boolean).sort((e, t) => e.start - t.start)]))
	})), n = {};
	for (let [t, r] of Object.entries(e.depth && typeof e.depth == "object" ? e.depth : {})) typeof r == "number" && Number.isFinite(r) && r > -950 && (n[t] = r);
	return {
		actors: t,
		depth: n,
		focal: typeof e.focal == "number" && e.focal > 0 ? e.focal : it
	};
}
//#endregion
//#region src/core/model.js
var st = "rigby-snapshot/1", ct = [
	"normal",
	"onlyTranslation",
	"noRotationOrReflection",
	"noScale",
	"noScaleOrReflection"
], lt = [
	"normal",
	"additive",
	"multiply",
	"screen"
], ut = ["linear", "nearest"], dt = [
	"region",
	"mesh",
	"linkedmesh",
	"boundingbox",
	"path",
	"point",
	"clipping"
];
function ft() {
	return {
		fps: 30,
		width: 1920,
		height: 1080,
		background: null,
		frame: null
	};
}
var P = class extends Error {
	constructor(e, t) {
		super(e === "json" ? `invalid JSON: ${t}` : `invalid skeleton: ${t}`), this.name = "LoadError", this.kind = e;
	}
};
function pt(e, t, n, r) {
	return {
		name: e,
		parent: t,
		length: r,
		setup: n,
		inherit: "normal",
		skinRequired: !1,
		color: null
	};
}
function mt(e) {
	return e.weights ? e.weights.length : e.type === "mesh" ? e.uvs.length / 2 : e.vertexCount ?? (e.vertices?.length ?? 0) / 2;
}
var ht = class e {
	constructor() {
		this.format = st, this.name = "untitled", this.bones = [pt("root", null, y(), 0)], this.slots = [], this.skins = [], this.skin = null, this.ik = [], this.events = [], this.animations = [], this.images = [], this.header = null, this.extra = {}, this.settings = ft(), this.settingsInFile = !1, this.textureFilter = "linear", this.pixelGrid = 0, this.poses = [], this.controllers = [], this.workspace = null, this.audio = [], this.scene = null;
	}
	static fromJson(t) {
		let n;
		try {
			n = JSON.parse(t);
		} catch (e) {
			throw new P("json", e.message);
		}
		let r = e.fromObject(n), i = r.validate();
		if (i) throw new P("invalid", i);
		return r;
	}
	static fromObject(e) {
		try {
			return At(e);
		} catch (e) {
			throw e instanceof P ? e : new P("json", e.message);
		}
	}
	toObject() {
		return Mt(this);
	}
	toSnapshot() {
		return JSON.stringify(this.toObject());
	}
	toJson() {
		return JSON.stringify(this.toObject(), null, 2);
	}
	clone() {
		return e.fromObject(this.toObject());
	}
	validate() {
		let e = this.bones.length, t = this.slots.length;
		if (e === 0) return "skeleton has no bones";
		for (let t = 0; t < e; t++) {
			let e = this.bones[t].parent;
			if (e !== null && e >= t) return `bone '${this.bones[t].name}' must come after its parent`;
		}
		let n = (t, n) => {
			for (let r of t.weights ?? []) for (let t of r) if (t.bone >= e) return `${n} references missing bone ${t.bone}`;
			return null;
		};
		for (let t of this.slots) {
			if (t.bone >= e) return `slot '${t.name}' references missing bone ${t.bone}`;
			for (let e of t.attachments) {
				let t = n(e, `attachment '${e.name}'`);
				if (t) return t;
			}
		}
		for (let e of this.skins) for (let r of e.slots) {
			if (r.slot >= t) return `skin '${e.name}' references missing slot ${r.slot}`;
			for (let e of r.attachments) {
				let t = n(e, `attachment '${e.name}'`);
				if (t) return t;
			}
		}
		for (let t of this.ik) if (t.target >= e || t.bones.some((t) => t >= e)) return `IK constraint '${t.name}' references a missing bone`;
		for (let n of this.animations) {
			for (let t of n.bones) if (t.bone >= e) return `animation '${n.name}' references missing bone ${t.bone}`;
			for (let e of n.slots) if (e.slot >= t) return `animation '${n.name}' references missing slot ${e.slot}`;
			for (let e of n.deform) if (e.slot >= t) return `animation '${n.name}' references missing slot ${e.slot}`;
			for (let e of n.ik) if (e.constraint >= this.ik.length) return `animation '${n.name}' references missing IK constraint`;
		}
		return null;
	}
	boneIndex(e) {
		let t = this.bones.findIndex((t) => t.name === e);
		return t < 0 ? null : t;
	}
	slotIndex(e) {
		let t = this.slots.findIndex((t) => t.name === e);
		return t < 0 ? null : t;
	}
	animation(e) {
		return this.animations.find((t) => t.name === e);
	}
	findSkin(e) {
		return this.skins.find((t) => t.name === e);
	}
	skinAttachments(e, t) {
		return t == null || t === "default" ? this.slots[e]?.attachments ?? [] : this.findSkin(t)?.slots.find((t) => t.slot === e)?.attachments ?? [];
	}
	attachment(e, t, n = this.skin) {
		if (t != null) {
			if (n) {
				let r = this.skinAttachments(e, n).find((e) => e.name === t);
				if (r) return r;
			}
			return this.slots[e]?.attachments.find((e) => e.name === t);
		}
	}
	meshSource(e, t) {
		if (t.type !== "linkedmesh") return t;
		let n = this.skinAttachments(e, t.skin).find((e) => e.name === t.parent) ?? this.attachment(e, t.parent);
		return n && n.type === "mesh" ? n : null;
	}
	children(e) {
		let t = [];
		return this.bones.forEach((n, r) => {
			n.parent === e && t.push(r);
		}), t;
	}
	isDescendant(e, t) {
		let n = e;
		for (; n != null;) {
			if (n === t) return !0;
			n = this.bones[n].parent;
		}
		return !1;
	}
	uniqueBoneName(e) {
		return gt(e, (e) => this.boneIndex(e) !== null);
	}
	uniqueSlotName(e) {
		return gt(e, (e) => this.slotIndex(e) !== null);
	}
	addBone(e) {
		e.inherit ??= "normal", e.skinRequired ??= !1, e.color ??= null;
		let t;
		if (e.parent === null) t = this.bones.length;
		else {
			let n = e.parent;
			for (t = n + 1; t < this.bones.length && this.isDescendant(t, n);) t++;
		}
		this.bones.splice(t, 0, e);
		let n = (e) => e >= t ? e + 1 : e;
		return this.bones.forEach((e, r) => {
			r !== t && e.parent !== null && (e.parent = n(e.parent));
		}), this.remapBoneRefs(n), t;
	}
	removeBone(e) {
		if (e === 0) return;
		let t = this.bones.map((t, n) => this.isDescendant(n, e)), n = [], r = 0;
		for (let e of t) n.push(e ? null : r++);
		this.bones = this.bones.filter((e, n) => !t[n]);
		for (let e of this.bones) e.parent = e.parent === null ? null : n[e.parent];
		for (let e = this.slots.length - 1; e >= 0; e--) t[this.slots[e].bone] && this.removeSlot(e);
		this.remapBoneRefs((e) => n[e]), et(this);
	}
	reparentBone(e, t) {
		if (e === 0 || this.isDescendant(t, e)) return;
		let n = this.bones.map((e, t) => t), r = n.filter((t) => this.isDescendant(t, e)), i = n.filter((e) => !r.includes(e)), a = i.indexOf(t) + 1;
		for (; a < i.length && this.isDescendant(i[a], t);) a++;
		let o = [
			...i.slice(0, a),
			...r,
			...i.slice(a)
		], s = [];
		o.forEach((e, t) => s[e] = t), this.bones[e].parent = t, this.bones = o.map((e) => this.bones[e]);
		for (let e of this.bones) e.parent !== null && (e.parent = s[e.parent]);
		this.remapBoneRefs((e) => s[e]);
	}
	removeSlot(e) {
		this.slots.splice(e, 1), this.remapSlotRefs((t) => t === e ? null : t > e ? t - 1 : t), et(this);
	}
	moveSlot(e, t) {
		if (e === t || e >= this.slots.length || t >= this.slots.length) return;
		let [n] = this.slots.splice(e, 1);
		this.slots.splice(t, 0, n), this.remapSlotRefs((n) => n === e ? t : e < t && n > e && n <= t ? n - 1 : t < e && n >= t && n < e ? n + 1 : n);
	}
	remapSlotRefs(e) {
		let t = (t) => e(t) !== null && e(t) !== void 0;
		for (let n of this.skins) {
			n.slots = n.slots.filter((e) => t(e.slot));
			for (let t of n.slots) t.slot = e(t.slot);
		}
		for (let n of this.animations) {
			n.slots = n.slots.filter((e) => t(e.slot));
			for (let t of n.slots) t.slot = e(t.slot);
			n.deform = n.deform.filter((e) => t(e.slot));
			for (let t of n.deform) t.slot = e(t.slot);
			for (let r of n.drawOrder) if (r.value) {
				r.value = r.value.filter((e) => t(e.slot));
				for (let t of r.value) t.slot = e(t.slot);
			}
		}
		let n = (n) => {
			n.type === "clipping" && n.end !== null && n.end !== void 0 && (n.end = t(n.end) ? e(n.end) : null);
		};
		for (let e of this.slots) e.attachments.forEach(n);
		for (let e of this.skins) for (let t of e.slots) t.attachments.forEach(n);
	}
	remapBoneRefs(e) {
		let t = (t) => e(t) !== null && e(t) !== void 0, n = (t) => {
			for (let n of t.weights ?? []) for (let t of n) t.bone = e(t.bone) ?? 0;
		};
		for (let t of this.slots) t.bone = e(t.bone) ?? 0, t.attachments.forEach(n);
		for (let r of this.skins) {
			r.bones = r.bones.filter(t).map(e);
			for (let e of r.slots) e.attachments.forEach(n);
		}
		let r = [];
		this.ik = this.ik.filter((e, n) => {
			let i = t(e.target) && e.bones.every(t);
			return i || r.push(n), i;
		});
		for (let t of this.ik) t.target = e(t.target), t.bones = t.bones.map(e);
		for (let n of this.animations) {
			n.bones = n.bones.filter((e) => t(e.bone));
			for (let t of n.bones) t.bone = e(t.bone);
			if (r.length) {
				n.ik = n.ik.filter((e) => !r.includes(e.constraint));
				for (let e of n.ik) e.constraint -= r.filter((t) => t < e.constraint).length;
			}
		}
	}
};
function gt(e, t) {
	if (!t(e)) return e;
	for (let n = 2;; n++) {
		let r = `${e}${n}`;
		if (!t(r)) return r;
	}
}
function F(e, t, n) {
	if (e == null) {
		if (t === void 0) throw new P("json", `missing field \`${n}\``);
		return t;
	}
	if (typeof e != "number" || !Number.isFinite(e)) throw new P("json", `\`${n}\` must be a number`);
	return e;
}
function I(e, t, n = !1) {
	if (e == null && n) return null;
	if (!Number.isInteger(e) || e < 0) throw new P("json", `\`${t}\` must be a non-negative integer`);
	return e;
}
function L(e, t, n) {
	if (e == null) {
		if (t === void 0) throw new P("json", `missing field \`${n}\``);
		return t;
	}
	if (typeof e != "string") throw new P("json", `\`${n}\` must be a string`);
	return e;
}
function R(e, t) {
	if (e == null) return [];
	if (!Array.isArray(e)) throw new P("json", `\`${t}\` must be an array`);
	return e;
}
function z(e, t, n) {
	if (!Array.isArray(e) || t !== null && e.length !== t) throw new P("json", `\`${n}\` must have ${t} numbers`);
	return e.map((e) => F(e, void 0, n));
}
var _t = (e, t, n) => e == null ? null : z(e, t, n), B = (e, t) => typeof e == "boolean" ? e : t, V = (e, t, n) => t.includes(e) ? e : n, H = (e) => e === void 0 ? void 0 : JSON.parse(JSON.stringify(e)), vt = (e) => e.extra && typeof e.extra == "object" && Object.keys(e.extra).length ? { extra: H(e.extra) } : {}, yt = (e, t) => {
	t.extra && Object.keys(t.extra).length && (e.extra = H(t.extra));
};
function bt(e) {
	return {
		x: F(e.x, 0, "x"),
		y: F(e.y, 0, "y"),
		rotation: F(e.rotation, 0, "rotation"),
		scale_x: F(e.scale_x, 1, "scale_x"),
		scale_y: F(e.scale_y, 1, "scale_y"),
		shear_x: F(e.shear_x, 0, "shear_x"),
		shear_y: F(e.shear_y, 0, "shear_y")
	};
}
function xt(e) {
	let t = {
		x: e.x,
		y: e.y,
		rotation: e.rotation,
		scale_x: e.scale_x,
		scale_y: e.scale_y
	};
	return e.shear_x && (t.shear_x = e.shear_x), e.shear_y && (t.shear_y = e.shear_y), t;
}
function St(e, t, n) {
	return R(e, t).map((e) => T(F(e.time, void 0, "time"), n(e.value), l(e.curve ?? "linear")));
}
function Ct(e, t) {
	return e.map((e) => {
		let n = {
			time: e.time,
			value: t(e.value)
		};
		return e.curve !== "linear" && (n.curve = l(e.curve)), n;
	});
}
var wt = (e) => e == null ? null : L(e, void 0, "value"), Tt = (e) => Array.isArray(e) ? e.slice() : e && typeof e == "object" ? H(e) : e, Et = {
	rotate: (e) => F(e, void 0, "value"),
	translate: (e) => z(e, 2, "value"),
	scale: (e) => z(e, 2, "value"),
	shear: (e) => z(e, 2, "value"),
	translateX: (e) => F(e, void 0, "value"),
	translateY: (e) => F(e, void 0, "value"),
	scaleX: (e) => F(e, void 0, "value"),
	scaleY: (e) => F(e, void 0, "value"),
	shearX: (e) => F(e, void 0, "value"),
	shearY: (e) => F(e, void 0, "value"),
	inherit: (e) => V(e, ct, "normal")
}, Dt = {
	attachment: wt,
	color: (e) => z(e, 4, "value"),
	rgb: (e) => z(e, 3, "value"),
	alpha: (e) => F(e, void 0, "value"),
	rgba2: (e) => z(e, 7, "value"),
	rgb2: (e) => z(e, 6, "value")
};
function Ot(e) {
	let t = V(e.type, dt, "region"), n = {
		name: L(e.name, void 0, "name"),
		type: t,
		image: L(e.image, e.name, "image"),
		color: e.color === void 0 ? [
			1,
			1,
			1,
			1
		] : z(e.color, 4, "color")
	};
	return (t === "region" || t === "point") && (n.offset = bt(e)), (t === "region" || e.width !== void 0) && (n.width = F(e.width, void 0, "width")), (t === "region" || e.height !== void 0) && (n.height = F(e.height, void 0, "height")), t === "mesh" && (n.uvs = z(e.uvs, null, "uvs"), n.triangles = R(e.triangles, "triangles").map((e) => I(e, "triangles")), n.hull = F(e.hull, 0, "hull"), n.edges = e.edges ? R(e.edges, "edges").map((e) => I(e, "edges")) : null), t === "linkedmesh" && (n.parent = L(e.parent, void 0, "parent"), n.skin = e.skin === void 0 || e.skin === null ? null : L(e.skin, void 0, "skin"), n.deform = B(e.deform, !0)), [
		"mesh",
		"boundingbox",
		"path",
		"clipping"
	].includes(t) && (n.vertices = e.vertices ? z(e.vertices, null, "vertices") : null, n.weights = e.weights ? R(e.weights, "weights").map((e) => R(e, "weights").map((e) => ({
		bone: I(e.bone, "bone"),
		x: F(e.x, 0, "x"),
		y: F(e.y, 0, "y"),
		weight: F(e.weight, 0, "weight")
	}))) : null, t !== "mesh" && (n.vertexCount = I(e.vertexCount ?? 0, "vertexCount"))), t === "path" && (n.closed = B(e.closed, !1), n.constantSpeed = B(e.constantSpeed, !0), n.lengths = e.lengths ? z(e.lengths, null, "lengths") : []), t === "clipping" && (n.end = I(e.end, "end", !0)), e.sequence !== void 0 && (n.sequence = H(e.sequence)), e.colorSet && (n.colorSet = !0), Object.assign(n, vt(e)), n;
}
function kt(e) {
	let t = { name: e.name };
	e.type !== "region" && (t.type = e.type), e.image !== e.name && (t.image = e.image), e.offset && Object.assign(t, xt(e.offset)), e.width !== void 0 && (t.width = e.width), e.height !== void 0 && (t.height = e.height), e.color && e.color.some((e) => e !== 1) && (t.color = e.color.slice());
	for (let n of [
		"uvs",
		"triangles",
		"hull",
		"edges",
		"vertices",
		"vertexCount",
		"parent",
		"skin",
		"deform",
		"closed",
		"constantSpeed",
		"lengths",
		"end"
	]) e[n] !== void 0 && e[n] !== null && (t[n] = Tt(e[n]));
	return e.weights && (t.weights = e.weights.map((e) => e.map((e) => ({ ...e })))), e.sequence !== void 0 && (t.sequence = H(e.sequence)), e.colorSet && (t.colorSet = !0), yt(t, e), t;
}
function At(e) {
	if (typeof e != "object" || !e) throw new P("json", "expected an object");
	let t = new ht();
	if (t.format = L(e.format, st, "format"), t.name = L(e.name, "", "name"), !Array.isArray(e.bones)) throw new P("json", "missing field `bones`");
	return t.bones = e.bones.map((e) => ({
		...pt(L(e.name, void 0, "name"), I(e.parent, "parent", !0), bt(e), F(e.length, 0, "length")),
		inherit: V(e.inherit, ct, "normal"),
		skinRequired: B(e.skinRequired, !1),
		color: e.color === void 0 || e.color === null ? null : L(e.color, void 0, "color"),
		...vt(e)
	})), t.slots = R(e.slots, "slots").map((e) => ({
		name: L(e.name, void 0, "name"),
		bone: I(e.bone, "bone"),
		attachments: R(e.attachments, "attachments").map(Ot),
		attachment: e.attachment === void 0 || e.attachment === null ? null : L(e.attachment, void 0, "attachment"),
		color: e.color === void 0 ? [
			1,
			1,
			1,
			1
		] : z(e.color, 4, "color"),
		dark: _t(e.dark, 3, "dark"),
		blend: V(e.blend, lt, "normal"),
		...vt(e)
	})), t.skins = R(e.skins, "skins").map((e) => ({
		name: L(e.name, void 0, "name"),
		slots: R(e.slots, "slots").map((e) => ({
			slot: I(e.slot, "slot"),
			attachments: R(e.attachments, "attachments").map(Ot)
		})),
		bones: R(e.bones, "bones").map((e) => I(e, "bones")),
		ik: R(e.ik, "ik").map((e) => I(e, "ik")),
		color: e.color ?? null,
		extra: H(e.extra) ?? {}
	})), t.skin = e.skin === void 0 || e.skin === null ? null : L(e.skin, void 0, "skin"), t.ik = R(e.ik, "ik").map((e) => ({
		name: L(e.name, void 0, "name"),
		order: F(e.order, 0, "order"),
		skinRequired: B(e.skinRequired, !1),
		bones: R(e.bones, "bones").map((e) => I(e, "bones")),
		target: I(e.target, "target"),
		mix: F(e.mix, 1, "mix"),
		softness: F(e.softness, 0, "softness"),
		bendPositive: B(e.bendPositive, !0),
		compress: B(e.compress, !1),
		stretch: B(e.stretch, !1),
		uniform: B(e.uniform, !1),
		...vt(e)
	})), t.events = R(e.events, "events").map((e) => ({
		name: L(e.name, void 0, "name"),
		int: F(e.int, 0, "int"),
		float: F(e.float, 0, "float"),
		string: e.string === void 0 || e.string === null ? null : L(e.string, void 0, "string"),
		audio: e.audio === void 0 || e.audio === null ? null : L(e.audio, void 0, "audio"),
		volume: F(e.volume, 1, "volume"),
		balance: F(e.balance, 0, "balance"),
		...vt(e)
	})), t.animations = R(e.animations, "animations").map((e) => {
		let t = new de(L(e.name, void 0, "name"), F(e.duration, void 0, "duration"));
		return t.bones = R(e.bones, "bones").map((e) => {
			let t = le(I(e.bone, "bone"));
			for (let n of C) t[n] = St(e[n], n, Et[n]);
			return t;
		}), t.slots = R(e.slots, "slots").map((e) => {
			let t = ue(I(e.slot, "slot"));
			for (let n of w) t[n] = St(e[n], n, Dt[n]);
			return t;
		}), t.deform = R(e.deform, "deform").map((e) => ({
			skin: e.skin ?? null,
			slot: I(e.slot, "slot"),
			attachment: L(e.attachment, void 0, "attachment"),
			keys: St(e.keys, "keys", (e) => ({
				offset: I(e?.offset ?? 0, "offset"),
				vertices: z(e?.vertices ?? [], null, "vertices")
			}))
		})), t.drawOrder = St(e.drawOrder, "drawOrder", (e) => e == null ? null : R(e, "value").map((e) => ({
			slot: I(e.slot, "slot"),
			offset: F(e.offset, 0, "offset")
		}))), t.events = R(e.events, "events").map((e) => ({
			...H(e),
			time: F(e.time, 0, "time"),
			name: L(e.name, void 0, "name")
		})), t.ik = R(e.ik, "ik").map((e) => ({
			constraint: I(e.constraint, "constraint"),
			keys: St(e.keys, "keys", (e) => ({ ...H(e) }))
		})), t.extra = H(e.extra) ?? {}, t;
	}), t.images = R(e.images, "images").map((e) => ({
		name: L(e.name, void 0, "name"),
		path: e.path === void 0 || e.path === null ? null : L(e.path, void 0, "path"),
		width: I(e.width, "width"),
		height: I(e.height, "height")
	})), t.header = H(e.header) ?? null, t.extra = H(e.extra) ?? {}, t.settings = jt(e.settings), t.settingsInFile = e.settings !== void 0, t.textureFilter = V(e.textureFilter, ut, "linear"), t.pixelGrid = Number.isFinite(e.pixelGrid) && e.pixelGrid > 0 ? e.pixelGrid : 0, t.poses = nt(e.poses), t.controllers = rt(e.controllers), t.workspace = V(e.workspace, ["game", "film"], null), t.scene = ot(e.scene), t.audio = R(e.audio, "audio").filter((e) => e && typeof e.sound == "string" && typeof e.animation == "string").map((e) => ({
		sound: e.sound,
		animation: e.animation,
		offset: Number.isFinite(e.offset) ? e.offset : 0,
		volume: Number.isFinite(e.volume) ? Math.max(0, e.volume) : 1
	})), t;
}
function jt(e) {
	let t = ft();
	if (!e || typeof e != "object") return t;
	let n = (e, t, n) => typeof e == "number" && Number.isFinite(e) && e > 0 && e <= n ? e : t, r = (e) => Array.isArray(e) && e.length === 4 && e.every((e) => typeof e == "number" && e >= 0 && e <= 1) ? e.slice() : null, i = e.frame, a = i && typeof i == "object" && [i.x, i.y].every((e) => typeof e == "number" && Number.isFinite(e)) && n(i.scale, 0, 1e6) > 0 ? {
		x: i.x,
		y: i.y,
		scale: i.scale,
		...i.camera ? { camera: !0 } : {}
	} : null;
	return {
		fps: n(e.fps, t.fps, 240),
		width: Math.round(n(e.width, t.width, 16384)),
		height: Math.round(n(e.height, t.height, 16384)),
		background: r(e.background),
		frame: a
	};
}
function Mt(e) {
	let t = {
		format: e.format,
		name: e.name,
		bones: e.bones.map((e) => {
			let t = { name: e.name };
			return e.parent !== null && (t.parent = e.parent), t.length = e.length, Object.assign(t, xt(e.setup)), e.inherit && e.inherit !== "normal" && (t.inherit = e.inherit), e.skinRequired && (t.skinRequired = !0), e.color && (t.color = e.color), yt(t, e), t;
		}),
		slots: e.slots.map((e) => {
			let t = {
				name: e.name,
				bone: e.bone,
				attachments: e.attachments.map(kt)
			};
			return e.attachment !== null && (t.attachment = e.attachment), t.color = e.color.slice(), e.dark && (t.dark = e.dark.slice()), e.blend && e.blend !== "normal" && (t.blend = e.blend), yt(t, e), t;
		})
	};
	return e.skins.length && (t.skins = e.skins.map((e) => {
		let t = {
			name: e.name,
			slots: e.slots.map((e) => ({
				slot: e.slot,
				attachments: e.attachments.map(kt)
			}))
		};
		return e.bones.length && (t.bones = e.bones.slice()), e.ik.length && (t.ik = e.ik.slice()), e.color && (t.color = e.color), Object.keys(e.extra ?? {}).length && (t.extra = H(e.extra)), t;
	})), e.skin && (t.skin = e.skin), e.ik.length && (t.ik = e.ik.map((e) => ({
		...e,
		bones: e.bones.slice()
	}))), e.events.length && (t.events = e.events.map((e) => ({ ...e }))), t.animations = e.animations.map((e) => {
		let t = {
			name: e.name,
			duration: e.duration
		};
		return e.bones.length && (t.bones = e.bones.map((e) => {
			let t = { bone: e.bone };
			for (let n of C) e[n].length && (t[n] = Ct(e[n], Tt));
			return t;
		})), e.slots.length && (t.slots = e.slots.map((e) => {
			let t = { slot: e.slot };
			for (let n of w) e[n].length && (t[n] = Ct(e[n], Tt));
			return t;
		})), e.deform.length && (t.deform = e.deform.map((e) => ({
			skin: e.skin,
			slot: e.slot,
			attachment: e.attachment,
			keys: Ct(e.keys, (e) => ({
				offset: e.offset,
				vertices: e.vertices.slice()
			}))
		}))), e.drawOrder.length && (t.drawOrder = Ct(e.drawOrder, (e) => e ? e.map((e) => ({ ...e })) : null)), e.events.length && (t.events = e.events.map((e) => ({ ...e }))), e.ik.length && (t.ik = e.ik.map((e) => ({
			constraint: e.constraint,
			keys: Ct(e.keys, (e) => ({ ...e }))
		}))), Object.keys(e.extra).length && (t.extra = H(e.extra)), t;
	}), e.images.length && (t.images = e.images.map((e) => {
		let t = { name: e.name };
		return e.path !== null && (t.path = e.path), t.width = e.width, t.height = e.height, t;
	})), e.header && (t.header = H(e.header)), Object.keys(e.extra).length && (t.extra = H(e.extra)), (e.settingsInFile || JSON.stringify(e.settings) !== JSON.stringify(ft())) && (t.settings = H(e.settings)), e.textureFilter !== "linear" && (t.textureFilter = e.textureFilter), e.pixelGrid > 0 && (t.pixelGrid = e.pixelGrid), e.poses.length && (t.poses = H(e.poses)), e.controllers.length && (t.controllers = H(e.controllers)), e.workspace && (t.workspace = e.workspace), e.audio.length && (t.audio = H(e.audio)), e.scene && (t.scene = H(e.scene)), t;
}
//#endregion
//#region src/core/pose.js
var Nt = Math.PI / 180, U = (e) => Math.atan2(e[1], e[0]) / Nt, W = (e, t) => [e[0] - t[0], e[1] - t[1]], G = (e) => Math.hypot(e[0], e[1]), Pt = new S(), Ft = class {
	constructor(e) {
		this.applied = [], this.world = [], this.constraintList = null, this.physics = /* @__PURE__ */ new Map(), this.physicsDelta = 0, this.placement = null, this.setToSetup(e);
	}
	setToSetup(e) {
		this.reset(e), this.updateWorld(e);
	}
	reset(e) {
		let t = e.bones, n = e.slots;
		if (!this.local || this.local.length !== t.length) this.local = t.map((e) => ee(e.setup)), this.inherit = t.map((e) => e.inherit ?? "normal");
		else for (let e = 0; e < t.length; e++) b(t[e].setup, this.local[e]), this.inherit[e] = t[e].inherit ?? "normal";
		if (!this.attachment || this.attachment.length !== n.length) this.attachment = n.map((e) => e.attachment), this.color = n.map((e) => e.color.slice()), this.dark = n.map((e) => e.dark ? e.dark.slice() : null), this.drawOrder = n.map((e, t) => t), this.sequence = n.map(() => -1);
		else for (let e = 0; e < n.length; e++) {
			let t = n[e];
			this.attachment[e] = t.attachment, this.sequence[e] = -1;
			let r = this.color[e];
			for (let e = 0; e < 4; e++) r[e] = t.color[e];
			if (t.dark) {
				let n = this.dark[e] ?? (this.dark[e] = [
					0,
					0,
					0
				]);
				for (let e = 0; e < 3; e++) n[e] = t.dark[e];
			} else this.dark[e] = null;
			this.drawOrder[e] = e;
		}
		this.deform ? this.deform.clear() : this.deform = /* @__PURE__ */ new Map(), (!this.ik || this.ik.length !== e.ik.length) && (this.ik = e.ik.map(() => ({})));
		for (let t = 0; t < e.ik.length; t++) {
			let n = e.ik[t], r = this.ik[t];
			r.mix = n.mix, r.softness = n.softness, r.bendPositive = n.bendPositive, r.compress = n.compress, r.stretch = n.stretch;
		}
		De(this.ensureConstraints(e), this.constraintState);
	}
	ensureConstraints(e) {
		let t = ve(e);
		return t !== this.constraintList && (this.constraintList = t, this.constraintState = Ee(t)), t;
	}
	apply(e, t, n, r) {
		let i = r >= .5;
		for (let a of t.bones) {
			let t = e.bones[a.bone];
			if (!t) continue;
			let o = t.setup, s = this.local[a.bone], { x: c, y: l, rotation: u, scale_x: d, scale_y: f, shear_x: p, shear_y: m } = s, h = (e) => e !== void 0 && e.length > 0;
			h(a.rotate) && (u = o.rotation + D(a.rotate, n, 0)), h(a.translate) && (c = o.x + D(a.translate, n, 0), l = o.y + D(a.translate, n, 1)), h(a.translateX) && (c = o.x + D(a.translateX, n, 0)), h(a.translateY) && (l = o.y + D(a.translateY, n, 0)), h(a.scale) && (d = o.scale_x * D(a.scale, n, 0), f = o.scale_y * D(a.scale, n, 1)), h(a.scaleX) && (d = o.scale_x * D(a.scaleX, n, 0)), h(a.scaleY) && (f = o.scale_y * D(a.scaleY, n, 0)), h(a.shear) && (p = (o.shear_x ?? 0) + D(a.shear, n, 0), m = (o.shear_y ?? 0) + D(a.shear, n, 1)), h(a.shearX) && (p = (o.shear_x ?? 0) + D(a.shearX, n, 0)), h(a.shearY) && (m = (o.shear_y ?? 0) + D(a.shearY, n, 0)), i && h(a.inherit) && (this.inherit[a.bone] = E(a.inherit, n)), r >= 1 ? (s.x = c, s.y = l, s.rotation = u, s.scale_x = d, s.scale_y = f, s.shear_x = p, s.shear_y = m) : (s.x = _(s.x, c, r), s.y = _(s.y, l, r), s.rotation = _(s.rotation, u, r), s.scale_x = _(s.scale_x, d, r), s.scale_y = _(s.scale_y, f, r), s.shear_x = _(s.shear_x ?? 0, p ?? 0, r), s.shear_y = _(s.shear_y ?? 0, m ?? 0, r));
		}
		for (let e of t.slots) {
			let t = e.slot;
			if (t >= this.attachment.length) continue;
			let a;
			i && (a = E(e.attachment, n)) !== void 0 && (this.attachment[t] = a);
			let o = this.color[t].slice(), s = this.dark[t] ? this.dark[t].slice() : null;
			(a = E(e.color, n)) !== void 0 && o.splice(0, 4, ...a), (a = E(e.rgb, n)) !== void 0 && o.splice(0, 3, ...a), (a = E(e.alpha, n)) !== void 0 && (o[3] = a), (a = E(e.rgba2, n)) !== void 0 && (o.splice(0, 4, ...a.slice(0, 4)), s = a.slice(4, 7)), (a = E(e.rgb2, n)) !== void 0 && (o.splice(0, 3, ...a.slice(0, 3)), s = a.slice(3, 6));
			let c = this.color[t];
			for (let e = 0; e < 4; e++) c[e] = _(c[e], o[e], r);
			s && (this.dark[t] = (this.dark[t] ?? s).map((e, t) => _(e, s[t], r)));
		}
		for (let i of t.deform) {
			if (!i.keys.length) continue;
			let t = e.slots[i.slot] && e.attachment(i.slot, i.attachment, i.skin ?? e.skin);
			if (!t) continue;
			let a = e.meshSource(i.slot, t) ?? t, o = It(i.keys, n, Lt(a)), s = `${i.slot}/${i.attachment}`, c = this.deform.get(s);
			this.deform.set(s, c && r < 1 ? c.map((e, t) => _(e, o[t], r)) : o);
		}
		if (i && t.extra?.attachments) for (let [r, i] of Object.entries(t.extra.attachments)) for (let [t, a] of Object.entries(i)) {
			let i = e.slots.findIndex((e) => e.name === t);
			if (!(i < 0)) for (let [t, o] of Object.entries(a)) {
				if (!Array.isArray(o.sequence) || this.attachment[i] !== t) continue;
				let a = e.attachment(i, t, r === "default" ? null : r) ?? e.attachment(i, t);
				if (!a?.sequence) continue;
				let s = Ke(o.sequence, n, a.sequence.count ?? 1);
				s !== null && (this.sequence[i] = s);
			}
		}
		if (i && t.drawOrder.length) {
			let r = se(t.drawOrder, n);
			r >= 0 && (this.drawOrder = Ht(e.slots.length, t.drawOrder[r].value));
		}
		ke(this.ensureConstraints(e), this.constraintState, t, n, r);
		for (let e of t.ik) {
			let t = this.ik[e.constraint];
			if (!t) continue;
			let a = se(e.keys, n);
			if (a < 0) continue;
			let o = e.keys[a], s = e.keys[a + 1], c = s && s.time > o.time && o.curve !== "stepped" ? (n - o.time) / (s.time - o.time) : 0, l = (e, t) => {
				let n = o.value[e] ?? t;
				return _(n, s ? s.value[e] ?? t : n, c);
			};
			t.mix = _(t.mix, l("mix", 1), r), t.softness = _(t.softness, l("softness", 0), r), i && (t.bendPositive = o.value.bendPositive ?? !0, t.compress = o.value.compress ?? !1, t.stretch = o.value.stretch ?? !1);
		}
	}
	updateWorld(e) {
		let t = this.local.length;
		for (let e = 0; e < t; e++) this.applied[e] = this.applied[e] ? b(this.local[e], this.applied[e]) : ee(this.local[e]);
		this.applied.length = t, this.computeWorld(e);
		let n = this.ensureConstraints(e), r = this.physicsDelta;
		this.physicsDelta = 0;
		let i = this.constraintSteps(e, n);
		for (let t = 0; t < i.length; t++) {
			let a = i[t];
			if (a.ik !== void 0) {
				let t = e.ik[a.ik];
				if (t.skinRequired && !this.skinActive(e, (e) => e.ik.includes(a.ik))) continue;
				this.solveIk(e, t, this.ik[a.ik]);
				continue;
			}
			let o = n[a.other];
			if (!Oe(e, o)) continue;
			let s = this.constraintState[a.other], c;
			if (o.type === "transform") c = Fe(this, o, s);
			else if (o.type === "path") c = Ie(e, this, o, s);
			else if (o.type === "slider") c = Ve(e, this, o, s);
			else {
				let t = this.physics.get(o.name);
				t || this.physics.set(o.name, t = {}), c = Be(e, this, o, s, t, r);
			}
			if (c?.all) this.computeWorld(e);
			else if (c?.world) this.setWorlds(e, c.world);
			else if (c?.local) for (let t of c.local) this.updateBranch(e, t);
		}
	}
	constraintSteps(e, t) {
		let n = this._steps, r = !n || this._stepsIk !== e.ik || this._stepsList !== t || n.length !== e.ik.length + t.length;
		if (!r) for (let i = 0; i < n.length; i++) {
			let a = n[i];
			if ((a.ik === void 0 ? t[a.other]?.order : e.ik[a.ik]?.order) !== a.order) {
				r = !0;
				break;
			}
		}
		return r && (n = [...e.ik.map((e, t) => ({
			order: e.order,
			ik: t
		})), ...t.map((e, t) => ({
			order: e.order,
			other: t
		}))], n.sort((e, t) => e.order - t.order), this._steps = n, this._stepsIk = e.ik, this._stepsList = t), n;
	}
	resetPhysics() {
		this.physics.clear();
	}
	setWorlds(e, t) {
		let n = this.dirtyFlags(e), r = e.bones, i = r.length;
		for (let e of t.keys()) i = Math.min(i, e);
		for (let a = i; a < r.length; a++) {
			let i = r[a].parent, o = t.get(a);
			o ? (this.applied[a] = i === null && this.placement ? Rt(this.placement, o, "normal") : Rt(i === null ? null : this.world[i], o, this.inherit[a]), this.world[a] = o, n[a] = 1) : i !== null && n[i] && (this.updateBone(e, a), n[a] = 1);
		}
	}
	dirtyFlags(e) {
		let t = e.bones.length;
		return !this.dirty || this.dirty.length !== t ? this.dirty = new Uint8Array(t) : this.dirty.fill(0), this.dirty;
	}
	updateBranch(e, t) {
		let n = this.dirtyFlags(e), r = e.bones;
		n[t] = 1, this.updateBone(e, t);
		for (let i = t + 1; i < r.length; i++) {
			let t = r[i].parent;
			t !== null && n[t] && (n[i] = 1, this.updateBone(e, i));
		}
	}
	updateBone(e, t) {
		let n = e.bones[t].parent, r = this.world[t] ?? (this.world[t] = new S());
		n === null ? this.placement ? S.multiply(this.placement, te(this.applied[t], Pt), r) : te(this.applied[t], r) : Vt(this.world[n], te(this.applied[t], Pt), this.inherit[t], r);
	}
	skinActive(e, t) {
		let n = e.skin ? e.findSkin(e.skin) : null;
		return !!n && t(n);
	}
	computeWorld(e) {
		this.world.length = e.bones.length;
		for (let t = 0; t < e.bones.length; t++) this.updateBone(e, t);
	}
	solveIk(e, t, n) {
		let r = n.mix;
		if (r <= 0 || !t.bones.length) return;
		let i = this.world[t.target].apply([0, 0]), a = (t) => {
			let n = e.bones[t].parent;
			return n !== null && this.world[n].determinant() < 0 ? -1 : 1;
		}, o = (e, t, n) => {
			let o = x(U(W(i, t)) - U(W(n, t)));
			this.applied[e].rotation += o * r * a(e);
		};
		if (t.bones.length === 1) {
			let a = t.bones[0], s = this.world[a], c = s.apply([0, 0]);
			o(a, c, s.apply([1, 0]));
			let l = e.bones[a].length * G([s.a, s.b]), u = G(W(i, c));
			if (l > 1e-4 && (n.compress && u < l || n.stretch && u > l)) {
				let e = (u / l - 1) * r + 1;
				this.applied[a].scale_x *= e, t.uniform && (this.applied[a].scale_y *= e);
			}
			this.updateBranch(e, a);
			return;
		}
		let [s, c] = t.bones, l = this.world[s].apply([0, 0]), u = this.world[c].apply([0, 0]), d = this.world[c].apply([e.bones[c].length, 0]), f = G(W(u, l)), p = G(W(d, u));
		if (f < 1e-4 || p < 1e-4) {
			o(s, l, u.some((e, t) => e !== l[t]) ? u : this.world[s].apply([1, 0])), this.updateBranch(e, s);
			return;
		}
		let m = G(W(i, l));
		if (n.stretch && m > f + p) {
			o(s, l, u), this.updateBranch(e, s), this.finishTwoBone(e, s, c, i, r, n, a);
			let d = (m / (f + p) - 1) * r + 1;
			this.applied[s].scale_x *= d, t.uniform && (this.applied[s].scale_y *= d), this.updateBranch(e, s);
			return;
		}
		let h = n.softness;
		h > 0 && m > f + p - h && (m = f + p - h * Math.exp(-(m - (f + p - h)) / h)), m = Math.min(Math.max(m, Math.abs(f - p) + 1e-6), f + p - 1e-6);
		let g = Math.min(1, Math.max(-1, (f * f + m * m - p * p) / (2 * f * m))), _ = Math.acos(g) / Nt, v = (n.bendPositive ? 1 : -1) * (this.world[s].determinant() < 0 ? -1 : 1), y = x(U(W(i, l)) - v * _ - U(W(u, l)));
		this.applied[s].rotation += y * r * a(s), this.updateBranch(e, s), this.finishTwoBone(e, s, c, i, r, n, a);
	}
	finishTwoBone(e, t, n, r, i, a, o) {
		let s = this.world[n].apply([0, 0]), c = this.world[n].apply([Math.max(e.bones[n].length, .001), 0]), l = x(U(W(r, s)) - U(W(c, s)));
		this.applied[n].rotation += l * i * o(n), this.updateBranch(e, n);
	}
	imageOf(e, t) {
		if (!t.sequence) return t.image ?? t.name;
		let n = this.sequence?.[e] ?? -1;
		return We(t, n >= 0 ? n : Ge(t));
	}
	attachmentWorld(e, t, n) {
		return this.world[e.slots[t].bone].mul(te(n.offset));
	}
	slotAttachment(e, t) {
		return e.attachment(t, this.attachment[t]);
	}
	deformOf(e, t) {
		if (this.deform.size) return this.deform.get(t.type === "linkedmesh" && t.deform ? `${e}/${t.parent}` : `${e}/${t.name}`);
	}
	worldVertices(e, t, n, r = []) {
		r.length = 0;
		let i = e.meshSource(t, n);
		if (!i) return r;
		let a = this.deformOf(t, n), o = this.world;
		if (i.weights) {
			let e = 0, t = i.weights;
			for (let n = 0; n < t.length; n++) {
				let i = t[n], s = 0, c = 0;
				for (let t = 0; t < i.length; t++) {
					let n = i[t], r = n.x + (a ? a[e] : 0), l = n.y + (a ? a[e + 1] : 0);
					e += 2;
					let u = o[n.bone];
					s += (u.a * r + u.c * l + u.tx) * n.weight, c += (u.b * r + u.d * l + u.ty) * n.weight;
				}
				r.push(s, c);
			}
		} else {
			let n = this.world[e.slots[t].bone], o = i.vertices ?? [];
			for (let e = 0; e + 1 < o.length; e += 2) {
				let t = o[e] + (a ? a[e] : 0), i = o[e + 1] + (a ? a[e + 1] : 0);
				r.push(n.a * t + n.c * i + n.tx, n.b * t + n.d * i + n.ty);
			}
		}
		return r;
	}
	quads(e) {
		let t = [];
		for (let n of this.drawOrder) {
			let r = e.slots[n];
			if (!r) continue;
			let i = this.slotAttachment(e, n);
			if (!i) continue;
			let a = this.color[n], o = i.color ? a.map((e, t) => e * i.color[t]) : a, s = r.blend ?? "normal";
			if (i.type === "region" || i.type === void 0) {
				let r = this.attachmentWorld(e, n, i), a = i.width * .5, c = i.height * .5;
				t.push({
					kind: "region",
					image: this.imageOf(n, i),
					slot: n,
					attachment: i,
					positions: [
						[-a, c],
						[a, c],
						[a, -c],
						[-a, -c]
					].map((e) => r.apply(e)),
					uvs: [
						[0, 0],
						[1, 0],
						[1, 1],
						[0, 1]
					],
					color: o,
					blend: s
				});
			} else if (i.type === "mesh" || i.type === "linkedmesh") {
				let r = e.meshSource(n, i);
				if (!r) continue;
				let a = this.worldVertices(e, n, i), c = [];
				for (let e = 0; e + 1 < a.length; e += 2) c.push([a[e], a[e + 1]]);
				t.push({
					kind: "mesh",
					slot: n,
					attachment: i,
					image: this.imageOf(n, i.type === "linkedmesh" ? i : r),
					positions: c,
					uvs: Bt(r),
					triangles: r.triangles,
					color: o,
					blend: s
				});
			}
		}
		return t;
	}
};
function It(e, t, n) {
	let r = (e) => {
		let t = new Float64Array(n), { offset: r = 0, vertices: i = [] } = e.value ?? {};
		for (let e = 0; e < i.length && r + e < n; e++) t[r + e] = i[e];
		return t;
	}, i = Math.max(0, se(e, t)), a = e[i], o = e[i + 1], s = r(a);
	if (!o || t <= a.time || a.curve === "stepped") return s;
	let c = r(o), l = f(a.curve, (t - a.time) / (o.time - a.time), 0);
	for (let e = 0; e < n; e++) s[e] += (c[e] - s[e]) * l;
	return s;
}
function Lt(e) {
	return e.weights ? e.weights.reduce((e, t) => e + t.length * 2, 0) : (e.vertices?.length ?? mt(e) * 2) | 0;
}
function Rt(e, t, n) {
	if (!e) return t.decompose();
	let [r, i] = e.inverse().apply([t.tx, t.ty]), a = Vt(e, new S(), n);
	a.tx = 0, a.ty = 0;
	let o = a.inverse().mul(new S(t.a, t.b, t.c, t.d, 0, 0));
	return o.tx = r, o.ty = i, o.decompose();
}
var zt = /* @__PURE__ */ new WeakMap();
function Bt(e) {
	let t = zt.get(e);
	if (t && t.uvs === e.uvs) return t.pairs;
	let n = [];
	for (let t = 0; t + 1 < e.uvs.length; t += 2) n.push([e.uvs[t], e.uvs[t + 1]]);
	return zt.set(e, {
		uvs: e.uvs,
		pairs: n
	}), n;
}
function Vt(e, t, n, r = new S()) {
	if (n === "normal" || !n) return S.multiply(e, t, r);
	let i = e.a * t.tx + e.c * t.ty + e.tx, a = e.b * t.tx + e.d * t.ty + e.ty, o = Math.hypot(e.a, e.b), s = e.determinant(), c, l, u, d;
	switch (n) {
		case "onlyTranslation":
			[c, l, u, d] = [
				1,
				0,
				0,
				1
			];
			break;
		case "noRotationOrReflection":
			[c, l, u, d] = [
				o,
				0,
				0,
				o > 1e-12 ? Math.abs(s) / o : 0
			];
			break;
		case "noScale":
		case "noScaleOrReflection": {
			let t = o > 1e-12 ? e.a / o : 1, r = o > 1e-12 ? e.b / o : 0, i = n === "noScale" && s < 0 ? -1 : 1;
			[c, l, u, d] = [
				t,
				r,
				-r * i,
				t * i
			];
			break;
		}
		default: return S.multiply(e, t, r);
	}
	return r.set(c * t.a + u * t.b, l * t.a + d * t.b, c * t.c + u * t.d, l * t.c + d * t.d, i, a);
}
function Ht(e, t) {
	let n = Array.from({ length: e }, (e, t) => t);
	if (!t || !t.length) return n;
	let r = Array(e).fill(-1), i = [], a = 0;
	for (let { slot: n, offset: o } of [...t].sort((e, t) => e.slot - t.slot)) {
		if (n >= e) continue;
		for (; a < n;) i.push(a++);
		let t = a + o;
		t >= 0 && t < e && r[t] === -1 ? r[t] = a : i.push(a), a++;
	}
	for (; a < e;) i.push(a++);
	for (let t = e - 1; t >= 0; t--) r[t] === -1 && (r[t] = i.pop());
	return r;
}
//#endregion
//#region src/core/interop.js
function Ut(e) {
	return !!e && typeof e == "object" && !!e.skeleton && typeof e.skeleton == "object" && Array.isArray(e.bones);
}
function K(e, t) {
	if (typeof e != "string" || !/^[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(e)) return t.slice();
	let n = [];
	for (let t = 0; t < e.length; t += 2) n.push(parseInt(e.slice(t, t + 2), 16) / 255);
	return n.length === 3 && t.length === 4 && n.push(1), n;
}
var Wt = "spine", Gt = [
	1,
	1,
	1,
	1
], Kt = {
	boundingbox: "60F000FF",
	path: "FF7F00FF",
	point: "F1F100FF",
	clipping: "CE3A3AFF"
}, qt = /* @__PURE__ */ new Set(/* @__PURE__ */ "type.name.path.x.y.rotation.scaleX.scaleY.width.height.color.uvs.triangles.hull.edges.vertices.vertexCount.parent.source.skin.deform.timelines.closed.constantSpeed.lengths.end.sequence".split(".")), q = (e, t) => {
	let n = {};
	for (let [r, i] of Object.entries(e)) t.has(r) || (n[r] = i);
	return Object.keys(n).length ? n : void 0;
}, J = (e) => e === void 0 ? void 0 : JSON.parse(JSON.stringify(e)), Y = (e) => e && typeof e == "object" ? Object.entries(e) : [];
function Jt(e) {
	let t = String(e.skeleton?.spine ?? "3.8"), [n, r] = t.split(".").map(Number);
	return {
		text: t,
		major: n || 3,
		minor: r || 0
	};
}
function Yt(e, t) {
	if (!Array.isArray(e)) return {
		vertices: [],
		weights: null
	};
	if (e.length <= t * 2) return {
		vertices: e.slice(),
		weights: null
	};
	let n = [];
	for (let r = 0; r < e.length && n.length < t;) {
		let t = e[r++], i = [];
		for (let n = 0; n < t; n++) i.push({
			bone: e[r++],
			x: e[r++],
			y: e[r++],
			weight: e[r++]
		});
		n.push(i);
	}
	return {
		vertices: null,
		weights: n
	};
}
function Xt(e, t = "skeleton") {
	if (!Ut(e)) throw Error("not a skeleton JSON file");
	let n = Jt(e).major >= 4, r = [], i = new ht();
	i.name = t;
	let { [Wt]: a, ...o } = e.skeleton;
	i.header = {
		version: a ?? null,
		...J(o)
	}, typeof o.fps == "number" && o.fps > 0 && (i.settings.fps = o.fps);
	for (let t of Object.keys(e)) [
		"skeleton",
		"bones",
		"slots",
		"constraints",
		"ik",
		"transform",
		"path",
		"physics",
		"skins",
		"events",
		"animations"
	].includes(t) || (i.extra[t] = J(e[t]));
	let s = /* @__PURE__ */ new Map();
	i.bones = e.bones.map((e, t) => {
		s.set(e.name, t);
		let n = e.parent === void 0 ? null : s.get(e.parent);
		if (n === void 0) throw Error(`bone '${e.name}' references unknown parent '${e.parent}'`);
		let r = pt(e.name, n, {
			x: e.x ?? 0,
			y: e.y ?? 0,
			rotation: e.rotation ?? 0,
			scale_x: e.scaleX ?? 1,
			scale_y: e.scaleY ?? 1,
			shear_x: e.shearX ?? 0,
			shear_y: e.shearY ?? 0
		}, e.length ?? 0), i = e.inherit ?? e.transform ?? "normal";
		r.inherit = ct.includes(i) ? i : "normal", r.skinRequired = !!e.skin, r.color = e.color ?? null;
		let a = q(e, /* @__PURE__ */ new Set([
			"name",
			"parent",
			"length",
			"x",
			"y",
			"rotation",
			"scaleX",
			"scaleY",
			"shearX",
			"shearY",
			"inherit",
			"transform",
			"skin",
			"color"
		]));
		return a && (r.extra = a), r;
	});
	let c = (e) => {
		let t = s.get(e);
		if (t === void 0) throw Error(`unknown bone '${e}'`);
		return t;
	}, l = /* @__PURE__ */ new Map();
	i.slots = (e.slots ?? []).map((e, t) => {
		l.set(e.name, t);
		let n = {
			name: e.name,
			bone: c(e.bone),
			attachments: [],
			attachment: e.attachment ?? null,
			color: K(e.color, Gt),
			dark: e.dark ? K(e.dark, [
				0,
				0,
				0
			]) : null,
			blend: e.blend ?? "normal"
		}, r = q(e, /* @__PURE__ */ new Set([
			"name",
			"bone",
			"attachment",
			"color",
			"dark",
			"blend"
		]));
		return r && (n.extra = r), n;
	});
	let u = (e) => {
		let t = l.get(e);
		if (t === void 0) throw Error(`unknown slot '${e}'`);
		return t;
	}, d = Array.isArray(e.constraints) ? e.constraints : null, f = d ? d.map((e, t) => ({
		...e,
		order: e.order ?? t
	})).filter((e) => e.type === "ik") : e.ik ?? [];
	if (d) {
		let e = d.map((e, t) => ({
			index: t,
			data: J(e)
		})).filter((e) => e.data.type !== "ik");
		e.length && (i.extra.constraints = e);
		let t = e.filter((e) => ![
			"transform",
			"path",
			"physics",
			"slider"
		].includes(e.data.type)).length;
		t && r.push(`${t} constraint(s) of unknown types are kept but not evaluated`);
	}
	i.ik = f.map((e, t) => {
		let n = {
			name: e.name,
			order: e.order ?? t,
			skinRequired: !!e.skin,
			bones: (e.bones ?? []).map(c),
			target: c(e.target),
			mix: e.mix ?? 1,
			softness: e.softness ?? 0,
			bendPositive: e.bendPositive ?? !0,
			compress: !!e.compress,
			stretch: !!e.stretch,
			uniform: !!e.uniform
		}, r = q(e, /* @__PURE__ */ new Set([
			"type",
			"name",
			"order",
			"skin",
			"bones",
			"target",
			"mix",
			"softness",
			"bendPositive",
			"compress",
			"stretch",
			"uniform"
		]));
		return r && (n.extra = r), n;
	});
	let p = new Map(i.ik.map((e, t) => [e.name, t]));
	for (let t of [
		"transform",
		"path",
		"physics"
	]) e[t]?.length && (i.extra[t] = J(e[t]));
	let m = Array.isArray(e.skins) ? e.skins : Y(e.skins).map(([e, t]) => ({
		name: e,
		attachments: t
	}));
	for (let e of m) {
		let t = [];
		for (let [n, r] of Y(e.attachments)) {
			let a = u(n), o = Y(r).map(([e, t]) => Zt(e, t, u));
			e.name === "default" ? i.slots[a].attachments.push(...o) : t.push({
				slot: a,
				attachments: o
			});
		}
		if (e.name === "default") continue;
		let n = {};
		for (let t of [
			"transform",
			"path",
			"physics"
		]) e[t] && (n[t] = J(e[t]));
		let r = q(e, /* @__PURE__ */ new Set([
			"name",
			"attachments",
			"bones",
			"ik",
			"transform",
			"path",
			"physics",
			"color"
		]));
		r && Object.assign(n, r), i.skins.push({
			name: e.name,
			slots: t,
			bones: (e.bones ?? []).map(c),
			ik: (e.ik ?? []).map((e) => p.get(e)).filter((e) => e !== void 0),
			color: e.color ?? null,
			extra: n
		});
	}
	i.events = Y(e.events).map(([e, t]) => ({
		name: e,
		int: t.int ?? 0,
		float: t.float ?? 0,
		string: t.string ?? null,
		audio: t.audio ?? null,
		volume: t.volume ?? 1,
		balance: t.balance ?? 0
	}));
	let h = {
		v4: n,
		bone: c,
		slot: u,
		ikIndex: p,
		sk: i,
		warnings: r
	};
	i.animations = Y(e.animations).map(([e, t]) => tn(e, t, h));
	let g = i.validate();
	if (g) throw Error(g);
	return {
		skeleton: i,
		warnings: r
	};
}
function Zt(e, t, n) {
	let r = t.type ?? "region", i = {
		name: e,
		type: r,
		image: t.path ?? t.name ?? e
	};
	t.name !== void 0 && t.name !== e && (i.sourceName = t.name), i.color = K(t.color, K(Kt[r], Gt)), t.color !== void 0 && Kt[r] && (i.colorSet = !0), (r === "region" || r === "point") && (i.offset = {
		x: t.x ?? 0,
		y: t.y ?? 0,
		rotation: t.rotation ?? 0,
		scale_x: t.scaleX ?? 1,
		scale_y: t.scaleY ?? 1,
		shear_x: 0,
		shear_y: 0
	}), r === "region" && (i.width = t.width ?? 0, i.height = t.height ?? 0), r === "mesh" && (i.uvs = (t.uvs ?? []).slice(), i.triangles = (t.triangles ?? []).slice(), i.hull = t.hull ?? 0, i.edges = t.edges ? t.edges.slice() : null, i.width = t.width ?? 0, i.height = t.height ?? 0, Object.assign(i, Yt(t.vertices, i.uvs.length / 2))), r === "linkedmesh" && (i.parent = t.parent ?? t.source, i.skin = t.skin ?? null, i.deform = t.deform ?? t.timelines ?? !0, i.width = t.width ?? 0, i.height = t.height ?? 0), (r === "boundingbox" || r === "path" || r === "clipping") && (i.vertexCount = t.vertexCount ?? 0, Object.assign(i, Yt(t.vertices, i.vertexCount))), r === "path" && (i.closed = !!t.closed, i.constantSpeed = t.constantSpeed ?? !0, i.lengths = (t.lengths ?? []).slice()), r === "clipping" && (i.end = t.end === void 0 ? null : n(t.end)), t.sequence !== void 0 && (i.sequence = J(t.sequence));
	let a = q(t, qt);
	return a && (i.extra = a), i;
}
function Qt(e, t, n, r, i) {
	let s = e.curve;
	if (s == null) return a;
	if (s === "stepped") return o;
	if (typeof s == "number") return { bezier: [
		s,
		e.c2 ?? 0,
		e.c3 ?? 1,
		e.c4 ?? 1
	] };
	if (!Array.isArray(s)) return a;
	if (!i && s.length === 4) return { bezier: s.slice() };
	if (!t) return a;
	let c = $t(s, e, t, n, r);
	return c !== "linear" && (c.src = {
		curve: s.slice(),
		t1: e.time ?? 0,
		t2: t.time ?? 0,
		v: n.slice(),
		nv: r.slice()
	}), c;
}
function $t(e, t, n, r, i) {
	let o = t.time ?? 0, s = (n.time ?? 0) - o || 1, c = [];
	for (let t = 0; t + 3 < e.length && c.length < r.length; t += 4) {
		let n = r[c.length], a = i[c.length] - n;
		Math.abs(a) <= 1e-9 ? c.push(null) : c.push([
			(e[t] - o) / s,
			(e[t + 1] - n) / a,
			(e[t + 2] - o) / s,
			(e[t + 3] - n) / a
		]);
	}
	if (!c.length) return a;
	let l = c.filter(Boolean);
	if (!l.length) return { bezier: [
		(e[0] - o) / s,
		0,
		(e[2] - o) / s,
		1
	].map(en) };
	let u = l.every((e) => e.every((e, t) => Math.abs(e - l[0][t]) < 1e-4));
	return c.length === 1 || u ? { bezier: l[0].map(en) } : { beziers: c.map((e) => (e ?? l[0]).map(en)) };
}
var en = (e) => Math.round(e * 1e5) / 1e5;
function X(e, t, n) {
	let r = e ?? [];
	return r.map((e, i) => {
		let a = t(e), o = r[i + 1], s = Qt(e, o, a, o ? t(o) : a, n);
		return T(e.time ?? 0, a.length === 1 ? a[0] : a, s);
	});
}
function tn(e, t, { v4: n, bone: r, slot: i, ikIndex: s, sk: c, warnings: l }) {
	let u = new de(e, 0), d = (e, t, n) => e[t] ?? n;
	for (let [i, a] of Y(t.bones)) {
		let t = le(r(i));
		for (let [r, s] of Y(a)) switch (r) {
			case "rotate":
				t.rotate = X(s, (e) => [e.value ?? e.angle ?? 0], n);
				break;
			case "translate":
				t.translate = X(s, (e) => [d(e, "x", 0), d(e, "y", 0)], n);
				break;
			case "scale":
				t.scale = X(s, (e) => [d(e, "x", 1), d(e, "y", 1)], n);
				break;
			case "shear":
				t.shear = X(s, (e) => [d(e, "x", 0), d(e, "y", 0)], n);
				break;
			case "translatex":
			case "translatey":
			case "scalex":
			case "scaley":
			case "shearx":
			case "sheary": {
				let e = {
					translatex: "translateX",
					translatey: "translateY",
					scalex: "scaleX",
					scaley: "scaleY",
					shearx: "shearX",
					sheary: "shearY"
				}[r], i = +!!r.startsWith("scale");
				t[e] = X(s, (e) => [e.value ?? i], n);
				break;
			}
			case "inherit":
			case "transform":
				t.inherit = (s ?? []).map((e) => T(e.time ?? 0, e.inherit ?? e.value ?? "normal", o));
				break;
			default: (u.extra.bones ??= {})[i] = {
				...u.extra.bones?.[i] ?? {},
				[r]: J(s)
			}, l.push(`animation '${e}': unsupported bone timeline '${r}' kept as-is`);
		}
		u.bones.push(t);
	}
	for (let [r, a] of Y(t.slots)) {
		let t = ue(i(r));
		for (let [i, s] of Y(a)) switch (i) {
			case "attachment":
				t.attachment = (s ?? []).map((e) => T(e.time ?? 0, e.name ?? null, o));
				break;
			case "color":
			case "rgba":
				t.color = X(s, (e) => K(e.color, Gt), n);
				break;
			case "rgb":
				t.rgb = X(s, (e) => K(e.color, [
					1,
					1,
					1
				]), n);
				break;
			case "alpha":
				t.alpha = X(s, (e) => [e.value ?? 1], n);
				break;
			case "twoColor":
			case "rgba2":
				t.rgba2 = X(s, (e) => [...K(e.light, Gt), ...K(e.dark, [
					0,
					0,
					0
				])], n);
				break;
			case "rgb2":
				t.rgb2 = X(s, (e) => [...K(e.light, [
					1,
					1,
					1
				]), ...K(e.dark, [
					0,
					0,
					0
				])], n);
				break;
			default: (u.extra.slots ??= {})[r] = {
				...u.extra.slots?.[r] ?? {},
				[i]: J(s)
			}, l.push(`animation '${e}': unsupported slot timeline '${i}' kept as-is`);
		}
		u.slots.push(t);
	}
	let f = (e, t, r, a) => {
		u.deform.push({
			skin: e === "default" ? null : e,
			slot: i(t),
			attachment: r,
			keys: (a ?? []).map((e, t) => {
				let r = a[t + 1];
				return T(e.time ?? 0, {
					offset: e.offset ?? 0,
					vertices: (e.vertices ?? []).slice()
				}, Qt(e, r, [0], [1], n));
			})
		});
	};
	for (let [e, n] of Y(t.deform)) for (let [t, r] of Y(n)) for (let [n, i] of Y(r)) f(e, t, n, i);
	for (let [e, n] of Y(t.attachments)) for (let [t, r] of Y(n)) for (let [n, i] of Y(r)) {
		i.deform && f(e, t, n, i.deform);
		let r = q(i, /* @__PURE__ */ new Set(["deform"]));
		r && ((((u.extra.attachments ??= {})[e] ??= {})[t] ??= {})[n] = J(r));
	}
	u.drawOrder = (t.drawOrder ?? t.draworder ?? []).map((e) => T(e.time ?? 0, e.offsets ? e.offsets.map((e) => ({
		slot: i(e.slot),
		offset: e.offset ?? 0
	})) : null, o)), u.events = (t.events ?? []).map((e) => ({
		...J(e),
		time: e.time ?? 0
	}));
	for (let [e, n] of Y(t.ik)) {
		let t = s.get(e);
		t !== void 0 && u.ik.push({
			constraint: t,
			keys: (n ?? []).map((e) => {
				let t = {
					mix: e.mix ?? 1,
					softness: e.softness ?? 0,
					bendPositive: e.bendPositive ?? !0,
					compress: !!e.compress,
					stretch: !!e.stretch
				};
				return e.curve !== void 0 && (t.curve = J(e.curve)), T(e.time ?? 0, t, a);
			})
		});
	}
	for (let e of [
		"transform",
		"path",
		"physics"
	]) t[e] && (u.extra[e] = J(t[e]));
	let p = q(t, /* @__PURE__ */ new Set([
		"bones",
		"slots",
		"deform",
		"attachments",
		"drawOrder",
		"draworder",
		"events",
		"ik",
		"transform",
		"path",
		"physics"
	]));
	return p && Object.assign(u.extra, p), u.duration = nn(t, u), u;
}
function nn(e, t) {
	let n = t.lastKeyTime(), r = (e) => {
		if (Array.isArray(e)) {
			for (let t of e) t && typeof t == "object" && typeof t.time == "number" && (n = Math.max(n, t.time));
			e.forEach(r);
		} else e && typeof e == "object" && Object.values(e).forEach(r);
	};
	for (let t of [
		"transform",
		"path",
		"physics",
		"attachments"
	]) r(e[t]);
	return n;
}
//#endregion
//#region src/core/binary.js
var rn = [
	"normal",
	"onlyTranslation",
	"noRotationOrReflection",
	"noScale",
	"noScaleOrReflection"
], an = [
	"normal",
	"additive",
	"multiply",
	"screen"
], on = [
	["rotate", 1],
	["translate", 2],
	["translatex", 1],
	["translatey", 1],
	["scale", 2],
	["scalex", 1],
	["scaley", 1],
	["shear", 2],
	["shearx", 1],
	["sheary", 1]
], sn = 0, cn = 1, ln = 2, un = 3, dn = 4, fn = 1, pn = 2, mn = 4, hn = 8, gn = 16, _n = 32, vn = 64, yn = 128, bn = [
	[2, "x"],
	[4, "y"],
	[8, "rotate"],
	[16, "scaleX"],
	[32, "shearX"]
], xn = 64, Sn = 128, Cn = [
	"inertia",
	"strength",
	"damping",
	"mass",
	"wind",
	"gravity",
	"mix"
], wn = {
	inertia: .5,
	strength: 100,
	damping: .85,
	fps: 60,
	limit: 5e3
}, Tn = { 5: "wind" }, En = 1, Dn = 4, On = 32, kn = 64, An = 128, jn = 64, Mn = ["fixed", "percent"], Nn = [
	"length",
	"fixed",
	"percent",
	"proportional"
], Pn = [
	"tangent",
	"chain",
	"chainScale"
], Fn = [
	"rotate",
	"x",
	"y",
	"scaleX",
	"scaleY",
	"shearY"
], In = [
	"rotation",
	"x",
	"y",
	"scaleX",
	"scaleY",
	"shearY"
], Ln = [
	["mixRotate", "rotate"],
	["mixX", "x"],
	[
		"mixY",
		"y",
		1
	],
	["mixScaleX", "scaleX"],
	[
		"mixScaleY",
		"scaleY",
		3
	],
	["mixShearY", "shearY"]
], Rn = 0, zn = 1, Bn = 3, Vn = 0, Hn = 1, Un = 2, Wn = 3, Gn = 128, Kn = 4, qn = 6, Jn = 16, Yn = 32, Xn = 64, Zn = 16, Qn = {
	boundingbox: "60f000ff",
	path: "ff7f00ff"
}, $n = 8, er = 16, tr = 32, nr = 64, rr = 128, ir = 128, ar = 0, or = 1, sr = 2, cr = "9b9b9bff", lr = 0, ur = 1, dr = { 1: ["mix", 1] }, fr = { 0: "position" }, pr = 3, mr = 0, hr = 1, gr = [
	"hold",
	"once",
	"loop",
	void 0,
	"onceReverse"
], _r = Ln.map(([e]) => e), Z = class extends Error {
	constructor(e) {
		super(`${e} is not supported in .skel files yet; use skeleton JSON for this skeleton`), this.name = "Unsupported";
	}
}, vr = class {
	constructor(e) {
		this.b = e, this.p = 0, this.v = new DataView(e.buffer, e.byteOffset, e.byteLength), this.strings = [], this.dec = new TextDecoder(), this.slots = [];
	}
	slotName(e) {
		let t = this.slots[e];
		if (!t) throw Error("invalid slot index in .skel data");
		return t.name;
	}
	check(e) {
		if (this.p + e > this.b.length) throw Error("unexpected end of .skel data");
	}
	byte() {
		return this.check(1), this.b[this.p++];
	}
	bool() {
		return this.byte() !== 0;
	}
	float() {
		this.check(4);
		let e = this.v.getFloat32(this.p);
		return this.p += 4, yr(e);
	}
	uint() {
		this.check(4);
		let e = this.v.getUint32(this.p);
		return this.p += 4, e;
	}
	varint(e = !0) {
		let t = 0, n = 0, r;
		do
			r = this.byte(), t |= (r & 127) << n, n += 7;
		while (r & 128 && n < 35);
		return e ? t >>> 0 : t >>> 1 ^ -(t & 1);
	}
	string() {
		let e = this.varint();
		if (e === 0) return null;
		if (e === 1) return "";
		this.check(e - 1);
		let t = this.dec.decode(this.b.subarray(this.p, this.p + e - 1));
		return this.p += e - 1, t;
	}
	ref() {
		let e = this.varint();
		if (e === 0) return null;
		if (e > this.strings.length) throw Error("invalid string reference in .skel data");
		return this.strings[e - 1];
	}
	color() {
		return this.uint().toString(16).padStart(8, "0");
	}
	color3() {
		this.check(3);
		let e = [...this.b.subarray(this.p, this.p + 3)].map((e) => e.toString(16).padStart(2, "0")).join("");
		return this.p += 3, e;
	}
};
function yr(e) {
	if (!Number.isFinite(e) || e === 0) return e === 0 ? 0 : e;
	for (let t = 6; t <= 9; t++) {
		let n = +e.toPrecision(t);
		if (Math.fround(n) === e) return n;
	}
	return e;
}
var br = (e) => e.length > 9 && e[8] > 1 && e[8] < 64;
function xr(e) {
	if (!br(e)) return !1;
	let t = e[8] - 1, n = new TextDecoder().decode(e.subarray(9, 9 + t));
	return /^\d+\.\d+/.test(n);
}
function Sr(e) {
	let t = "";
	for (let n of e) t += String.fromCharCode(n);
	return btoa(t).replace(/=+$/, "");
}
function Cr(e) {
	let t = new vr(e), n = Sr(e.subarray(0, 8));
	t.p = 8;
	let r = t.string();
	if (!/^4\.3/.test(r ?? "")) throw new Z(`Binary format ${r}`);
	let i = {
		hash: n,
		[Wt]: r,
		x: t.float(),
		y: t.float(),
		width: t.float(),
		height: t.float()
	}, a = t.float();
	a !== 100 && (i.referenceScale = a);
	let o = t.bool();
	if (o) {
		let e = t.float();
		e !== 30 && (i.fps = e), i.images = t.string(), i.audio = t.string();
	}
	let s = {
		skeleton: i,
		_strings: []
	}, c = t.varint();
	for (let e = 0; e < c; e++) t.strings.push(t.string());
	s._strings = t.strings.slice(), s.bones = [];
	let l = t.varint();
	for (let e = 0; e < l; e++) {
		let n = { name: t.string() };
		e > 0 && (n.parent = s.bones[t.varint()].name);
		let r = t.float(), i = t.float(), a = t.float(), c = t.float(), l = t.float(), u = t.float(), d = t.float(), f = rn[t.byte()] ?? "normal", p = t.float();
		if (p && (n.length = p), r && (n.rotation = r), i && (n.x = i), a && (n.y = a), c !== 1 && (n.scaleX = c), l !== 1 && (n.scaleY = l), u && (n.shearX = u), d && (n.shearY = d), f !== "normal" && (n.inherit = f), t.bool() && (n.skin = !0), o) {
			let e = t.color();
			e !== cr && (n.color = e);
			let r = t.string();
			r !== null && (n.icon = r);
			let i = t.float(), a = t.float(), o = t.bool();
			i !== 1 && (n._iconA = i), a !== 0 && (n._iconB = a), o || (n._visible = !1);
		}
		s.bones.push(n);
	}
	s.slots = [];
	let u = t.varint();
	for (let e = 0; e < u; e++) {
		let e = {
			name: t.string(),
			bone: s.bones[t.varint()].name
		}, n = t.color(), r = t.color();
		n !== "ffffffff" && (e.color = n), r !== "ffffffff" && (e.dark = r.slice(2));
		let i = t.ref();
		i !== null && (e.attachment = i);
		let a = an[t.byte()] ?? "normal";
		a !== "normal" && (e.blend = a), o && !t.bool() && (e._visible = !1), s.slots.push(e), t.slots.push(e);
	}
	s.constraints = [];
	let d = t.varint();
	for (let e = 0; e < d; e++) {
		let e = t.string(), n = t.byte();
		if (n === un) {
			s.constraints.push(jr(t, e, s));
			continue;
		}
		if (n === dn) {
			s.constraints.push(Ar(t, e, s));
			continue;
		}
		let r = [], i = t.varint();
		for (let e = 0; e < i; e++) r.push(s.bones[t.varint()].name);
		if (n === sn) s.constraints.push(wr(t, e, r, s));
		else if (n === cn) s.constraints.push(Er(t, e, r, s));
		else if (n === ln) s.constraints.push(Mr(t, e, r, s));
		else throw new Z(`Constraint type ${n} ('${e}')`);
	}
	s.constraints.length || delete s.constraints, s.skins = [{
		name: "default",
		attachments: Fr(t, s, o)
	}];
	let f = t.varint();
	for (let e = 0; e < f; e++) {
		let e = { name: t.string() };
		if (o) {
			let n = t.color();
			n !== "ffffffff" && (e._color = n);
		}
		let n = t.varint();
		n && (e.bones = []);
		for (let r = 0; r < n; r++) e.bones.push(s.bones[t.varint()].name);
		let r = t.varint();
		for (let n = 0; n < r; n++) {
			let n = s.constraints?.[t.varint()];
			if (!n) throw Error("invalid constraint index in .skel data");
			(e[n.type] ??= []).push(n.name);
		}
		e.attachments = Fr(t, s, o), s.skins.push(e);
	}
	for (let e of s.skins) for (let [t, n] of Object.entries(e.attachments)) for (let e of Object.values(n)) e.type === "linkedmesh" && (e._skinIndex !== void 0 && (e.skin = s.skins[e._skinIndex]?.name, delete e._skinIndex), s.slots[e._sourceSlot]?.name === t && delete e._sourceSlot);
	s.events = {};
	let p = [], m = t.varint();
	for (let e = 0; e < m; e++) {
		let e = t.string(), n = {}, r = t.varint(!1), i = t.float(), a = t.string(), o = t.string();
		r && (n.int = r), i && (n.float = i), a && (n.string = a), o !== null && (n.audio = o, n.volume = t.float(), n.balance = t.float()), s.events[e] = n, p.push(e);
	}
	p.length || delete s.events, s.animations = {};
	let h = t.varint();
	for (let e = 0; e < h; e++) {
		let e = t.string();
		s.animations[e] = Br(t, s, p);
	}
	let g = Object.keys(s.animations);
	for (let e of s.constraints ?? []) if (e.type === "slider" && (e.animation = g[t.varint()], e.animation === void 0)) throw Error("invalid animation index in .skel data");
	if (t.p !== e.length) throw Error(`unexpected data after the animations (${e.length - t.p} bytes)`);
	return s;
}
function wr(e, t, n, r) {
	let i = r.bones[e.varint()].name, a = e.byte();
	if (a & -102) throw new Z(`IK constraint options (flags 0x${a.toString(16)}) on '${t}'`);
	let o = {
		type: "ik",
		name: t,
		target: i,
		bones: n
	};
	a & En && (o.skin = !0), a & Dn && n.length > 1 && (o.bendPositive = !1);
	let s = Tr(e, a & On, a & kn);
	return s !== 1 && (o.mix = s), o;
}
function Tr(e, t, n) {
	return t ? n ? e.float() : 1 : 0;
}
function Er(e, t, n, r) {
	let i = r.slots[e.varint()].name, a = e.byte();
	if (a & -64) throw new Z(`Path constraint options (flags 0x${a.toString(16)}) on '${t}'`);
	let o = {
		type: "path",
		name: t,
		slot: i,
		bones: n
	};
	a & 1 && (o.skin = !0);
	let s = Mn[a >> 1 & 1], c = Nn[a >> 2 & 3], l = Pn[a >> 4 & 3];
	s !== "percent" && (o.positionMode = s), c !== "length" && (o.spacingMode = c), l !== "tangent" && (o.rotateMode = l);
	let u = e.float(), d = e.float();
	u && (o.position = u), d && (o.spacing = d);
	let f = e.float(), p = e.float(), m = e.float();
	return f !== 1 && (o.mixRotate = f), p !== 1 && (o.mixX = p), m !== p && (o.mixY = m), o;
}
function Dr(e, t, n) {
	let r = e.varint();
	for (let i = 0; i < r; i++) {
		let r = t.constraints[e.varint()]?.name;
		if (r === void 0) throw Error("invalid constraint index in .skel data");
		let i = e.varint();
		for (let t = 0; t < i; t++) {
			let t = e.byte(), i = dr[t];
			if (!i) throw new Z(`Slider key type ${t}`);
			let [a, o] = i, s = e.varint();
			e.varint(), ((n.slider ??= {})[r] ??= {})[a] = Q(e, s, (e, t) => {
				let n = e.float();
				return n !== o && (t.value = n), 1;
			});
		}
	}
}
function Or(e, t, n) {
	let r = e.varint();
	for (let i = 0; i < r; i++) {
		let r = t.constraints[e.varint()]?.name;
		if (r === void 0) throw Error("invalid constraint index in .skel data");
		let i = e.varint();
		for (let t = 0; t < i; t++) {
			let t = e.byte(), i = fr[t];
			if (!i) throw new Z(`Path constraint key type ${t}`);
			let a = e.varint();
			e.varint(), ((n.path ??= {})[r] ??= {})[i] = Q(e, a, (e, t) => {
				let n = e.float();
				return n !== 0 && (t.value = n), 1;
			});
		}
	}
}
function kr(e, t, n) {
	let r = e.varint();
	for (let i = 0; i < r; i++) {
		let r = e.varint(), i = r === 0 ? "" : t.constraints[r - 1]?.name;
		if (i === void 0) throw Error("invalid constraint index in .skel data");
		let a = e.varint();
		for (let t = 0; t < a; t++) {
			let t = e.byte(), r = Tn[t];
			if (!r) throw new Z(`Physics key type ${t}`);
			let a = e.varint();
			e.varint(), ((n.physics ??= {})[i] ??= {})[r] = Q(e, a, (e, t) => {
				let n = e.float();
				return n !== 0 && (t.value = n), 1;
			});
		}
	}
}
function Ar(e, t, n) {
	let r = {
		type: "slider",
		name: t
	}, i = e.byte();
	if (i & 37 || !(i & gn)) throw new Z(`Slider constraint options (flags 0x${i.toString(16)}) on '${t}'`);
	if (i & fn && (r.skin = !0), i & pn && (r.loop = !0), i & mn && (r.additive = !0), r.animation = null, i & hn && (r.time = e.float()), i & gn ? i & _n && (r.mix = e.float()) : r.mix = 0, i & vn) {
		r.bone = n.bones[e.varint()].name;
		let a = Fn[e.byte()];
		if (!a) throw new Z(`Slider property on '${t}'`);
		if (r.property = a, e.float() !== 0 || e.float() !== 0) throw new Z(`Slider property offsets on '${t}'`);
		r.scale = e.float(), i & yn && (r.local = !0);
	}
	return r;
}
function jr(e, t, n) {
	let r = {
		type: "physics",
		name: t,
		bone: n.bones[e.varint()].name
	}, i = e.byte();
	i & 1 && (r.skin = !0);
	for (let [t, n] of bn) i & t && (r[n] = e.float());
	i & xn && (r.limit = e.float());
	let a = e.byte();
	a !== wn.fps && (r.fps = a);
	for (let t of [
		"inertia",
		"strength",
		"damping"
	]) {
		let n = e.float();
		n !== wn[t] && (r[t] = n);
	}
	i & Sn && (r.mass = yr(Math.fround(1 / e.float())));
	let o = e.float(), s = e.float();
	o && (r.wind = o), s && (r.gravity = s);
	let c = e.byte();
	if (c & 128) throw new Z(`Physics constraint options (0x${c.toString(16)}) on '${t}'`);
	return Cn.forEach((e, t) => {
		c & 1 << t && (r[`${e}Global`] = !0);
	}), r;
}
function Mr(e, t, n, r) {
	let i = e.transformMapped ??= /* @__PURE__ */ new Map(), a = r.bones[e.varint()].name, o = e.byte();
	if (o & 30) throw new Z(`Transform constraint options (flags 0x${o.toString(16)}) on '${t}'`);
	let s = {
		type: "transform",
		name: t,
		source: a,
		bones: n
	};
	o & 1 && (s.skin = !0);
	let c = {}, l = /* @__PURE__ */ new Set();
	for (let n = o >> 5; n > 0; n--) {
		let n = Fn[e.byte()];
		if (!n) throw new Z(`Transform property on '${t}'`);
		let r = {}, i = e.float();
		i && (r.offset = i), r.to = {};
		let a = e.varint();
		for (let n = 0; n < a; n++) {
			let n = Fn[e.byte()];
			if (!n) throw new Z(`Transform property on '${t}'`);
			let i = {}, a = e.float(), o = e.float(), s = e.float();
			a && (i.offset = a), o !== 1 && (i.max = o), s !== 1 && (i.scale = s), r.to[n] = i, l.add(n);
		}
		c[n] = r;
	}
	let u = e.byte();
	if (u & -64) throw new Z(`Transform offsets on '${t}'`);
	In.forEach((t, n) => {
		u & 1 << n && (s[t] = e.float());
	}), s.properties = c, i.set(t, l);
	let d = e.byte();
	if (d & -64) throw new Z(`Transform mixes on '${t}'`);
	let f = Ln.map((t, n) => d & 1 << n ? e.float() : 0);
	return Ln.forEach(([e, t, n], r) => {
		if (!l.has(t)) return;
		let i = n === void 0 ? 1 : f[n];
		f[r] !== i && (s[e] = f[r]);
	}), s;
}
function Nr(e, t, n) {
	let r = e.varint();
	if (t.vertexCount = r, t.vertices = [], n) {
		e.varint();
		for (let n = 0; n < r; n++) {
			let n = e.varint();
			t.vertices.push(n);
			for (let r = 0; r < n; r++) t.vertices.push(e.varint(), e.float(), e.float(), e.float());
		}
	} else for (let n = 0; n < r * 2; n++) t.vertices.push(e.float());
}
function Pr(e, t) {
	t !== Qn[e.type] && (e.color = t);
}
function Fr(e, t, n) {
	let r = {}, i = e.varint();
	for (let a = 0; a < i; a++) {
		let i = t.slots[e.varint()].name, a = r[i] = {}, o = e.varint();
		for (let t = 0; t < o; t++) {
			let t = e.ref();
			a[t] = Ir(e, e.byte(), t, n);
		}
	}
	return r;
}
function Ir(e, t, n, r) {
	let i = t & 7;
	if (i === Hn || i === qn) {
		if ((t & -17) !== i) throw new Z(`Attachment options (flags 0x${t.toString(16)}) on '${n}'`);
		let a = { type: i === qn ? "clipping" : "boundingbox" };
		return i === qn && (a.end = e.slotName(e.varint())), Nr(e, a, !!(t & Zn)), r && Pr(a, e.color()), a;
	}
	if (i === Kn) {
		if (t & -117) throw new Z(`Path attachment options (flags 0x${t.toString(16)}) on '${n}'`);
		let i = { type: "path" };
		t & Jn && (i.closed = !0), t & Yn || (i.constantSpeed = !1), Nr(e, i, !!(t & Xn)), i.lengths = [];
		for (let t = 0; t < i.vertexCount / 3; t++) i.lengths.push(e.float());
		return r && Pr(i, e.color()), i;
	}
	if (i === Wn) {
		if (t & -144) throw new Z(`Linked mesh options (flags 0x${t.toString(16)}) on '${n}'`);
		let i = { type: "linkedmesh" };
		t & $n && (i.name = e.ref()), i._sourceSlot = e.varint();
		let a = e.varint();
		return i.source = e.ref(), a && (i._skinIndex = a), t & Gn || (i.timelines = !1), r && (i.width = e.float(), i.height = e.float()), i;
	}
	if (t & -256) throw new Z(`Attachment options (flags 0x${t.toString(16)}) on '${n}'`);
	let a = {};
	if (t & $n && (a.name = e.ref()), i === Vn) {
		t & er && (a.path = e.ref()), t & tr && (a.color = e.color()), t & nr && (a.sequence = Rr(e)), a.rotation = t & rr ? e.float() : 0, a.x = e.float(), a.y = e.float(), a.scaleX = e.float(), a.scaleY = e.float(), a.width = e.float(), a.height = e.float();
		for (let [e, t] of [
			["rotation", 0],
			["x", 0],
			["y", 0],
			["scaleX", 1],
			["scaleY", 1]
		]) a[e] === t && delete a[e];
		return a;
	}
	if (i !== Un) throw new Z(`Attachment type ${i} ('${n}')`);
	a.type = "mesh", t & er && (a.path = e.ref()), t & tr && (a.color = e.color()), t & nr && (a.sequence = Rr(e)), a.hull = e.varint();
	let o = e.varint();
	if (a.vertices = [], t & ir) {
		e.varint();
		for (let t = 0; t < o; t++) {
			let t = e.varint();
			a.vertices.push(t);
			for (let n = 0; n < t; n++) a.vertices.push(e.varint(), e.float(), e.float(), e.float());
		}
	} else for (let t = 0; t < o * 2; t++) a.vertices.push(e.float());
	a.uvs = [];
	for (let t = 0; t < o * 2; t++) a.uvs.push(e.float());
	a.triangles = [];
	for (let t = 0; t < 3 * (2 * o - a.hull - 2); t++) a.triangles.push(e.varint());
	if (e.byte() !== 0) throw new Z(`Mesh options ('${n}')`);
	if (r) {
		let t = e.varint();
		a.edges = [];
		for (let n = 0; n < t; n++) a.edges.push(e.varint());
		a.width = e.float(), a.height = e.float();
	}
	return a;
}
function Lr(e, t) {
	let n = [], r = 0;
	for (let i = 0; i < t; i++) {
		let t = {}, i = e.float(), a = e.uint(), o = e.float(), s = gr[a & 15];
		if (!s) throw new Z(`Sequence mode ${a & 15}`);
		i && (t.time = i), s !== "hold" && (t.mode = s), a >> 4 && (t.index = a >> 4), o !== r && (t.delay = o), r = o, n.push(t);
	}
	return n;
}
function Rr(e) {
	let t = { count: e.varint() }, n = e.varint(), r = e.varint(), i = e.varint();
	return n !== 1 && (t.start = n), r !== 0 && (t.digits = r), i !== 0 && (t.setup = i), t;
}
function Q(e, t, n) {
	let r = [];
	for (let i = 0; i < t; i++) {
		let t = { time: e.float() }, a = n(e, t);
		if (i > 0) {
			let t = e.byte(), n = r[i - 1];
			if (t === or) n.curve = "stepped";
			else if (t === sr) {
				n.curve = [];
				for (let t = 0; t < 4 * a; t++) n.curve.push(e.float());
			} else if (t !== ar) throw Error(`invalid curve type ${t}`);
		}
		r.push(t);
	}
	for (let e of r) e.time === 0 && delete e.time;
	return r;
}
function zr(e, t) {
	let n = [];
	for (let r = 0; r < t; r++) {
		let t = {}, i = e.float();
		if (i && (t.time = i), r > 0) {
			let t = e.byte(), i = n[r - 1];
			if (t === or) i.curve = "stepped";
			else if (t === sr) i.curve = [
				e.float(),
				e.float(),
				e.float(),
				e.float()
			];
			else if (t !== ar) throw Error(`invalid curve type ${t}`);
		}
		let a = e.varint();
		if (a) {
			let n = e.varint();
			n && (t.offset = n), t.vertices = [];
			for (let n = 0; n < a; n++) t.vertices.push(e.float());
		}
		n.push(t);
	}
	return n;
}
function Br(e, t, n) {
	let r = {};
	e.varint();
	let i = e.varint();
	for (let n = 0; n < i; n++) {
		let n = t.slots[e.varint()].name, i = (r.slots ??= {})[n] = {}, a = e.varint();
		for (let t = 0; t < a; t++) {
			let t = e.byte(), n = e.varint();
			if (t === Rn) {
				i.attachment = [];
				for (let t = 0; t < n; t++) {
					let t = e.float(), n = e.ref(), r = {};
					t && (r.time = t), n !== null && (r.name = n), i.attachment.push(r);
				}
			} else if (t === zn) e.varint(), i.rgba = Q(e, n, (e, t) => (t.color = e.color(), 4));
			else if (t === Bn) e.varint(), i.rgba2 = Q(e, n, (e, t) => (t.light = e.color(), t.dark = e.color3(), 7));
			else throw new Z(`Slot timeline type ${t}`);
		}
	}
	let a = e.varint();
	for (let n = 0; n < a; n++) {
		let n = t.bones[e.varint()].name, i = (r.bones ??= {})[n] = {}, a = e.varint();
		for (let t = 0; t < a; t++) {
			let t = e.byte(), n = e.varint();
			e.varint();
			let r = on[t];
			if (!r) throw new Z(`Bone timeline type ${t}`);
			let [a, o] = r, s = +!!a.startsWith("scale");
			i[a] = Q(e, n, (e, t) => {
				if (o === 1) {
					let n = e.float();
					n !== s && (t.value = n);
				} else {
					let n = e.float(), r = e.float();
					n !== s && (t.x = n), r !== s && (t.y = r);
				}
				return o;
			});
		}
	}
	let o = e.varint();
	for (let n = 0; n < o; n++) {
		let n = t.constraints[e.varint()].name, i = e.varint();
		e.varint();
		let a = (r.ik ??= {})[n] = [];
		for (let t = 0; t < i; t++) {
			let n = e.byte(), r = {}, i = e.float();
			if (i && (r.time = i), n & 1 ? n & 2 && (r.mix = e.float()) : r.mix = 0, n & 4 && (r.softness = e.float()), n & 8 || (r.bendPositive = !1), n & 16 && (r.compress = !0), n & 32 && (r.stretch = !0), n & jn) t > 0 && (a[t - 1].curve = "stepped");
			else if (n & An) {
				let n = [];
				for (let t = 0; t < 8; t++) n.push(e.float());
				t > 0 && (a[t - 1].curve = n);
			}
			a.push(r);
		}
	}
	let s = e.varint();
	for (let n = 0; n < s; n++) {
		let n = t.constraints[e.varint()].name, i = e.varint();
		e.varint();
		let a = e.transformMapped?.get(n) ?? new Set(Fn);
		(r.transform ??= {})[n] = Q(e, i, (e, t) => (Ln.forEach(([n, r]) => {
			let i = e.float();
			i !== 1 && a.has(r) && (t[n] = i);
		}), _r.length));
	}
	for (let n = 0; n < pr; n++) n === lr ? Or(e, t, r) : n === ur ? kr(e, t, r) : Dr(e, t, r);
	let c = e.varint();
	for (let n = 0; n < c; n++) {
		let n = t.skins[e.varint()]?.name;
		if (!n) throw Error("invalid skin index in .skel data");
		let i = e.varint();
		for (let t = 0; t < i; t++) {
			let t = e.slotName(e.varint()), i = e.varint();
			for (let a = 0; a < i; a++) {
				let i = e.ref(), a = e.byte(), o = e.varint(), s = (((r.attachments ??= {})[n] ??= {})[t] ??= {})[i] ??= {};
				if (a === mr) e.varint(), s.deform = zr(e, o);
				else if (a === hr) s.sequence = Lr(e, o);
				else throw new Z(`Attachment timeline type ${a}`);
			}
		}
	}
	let l = e.varint();
	for (let n = 0; n < l; n++) {
		let n = {}, i = e.float();
		i && (n.time = i);
		let a = e.varint();
		a && (n.offsets = []);
		for (let r = 0; r < a; r++) n.offsets.push({
			slot: t.slots[e.varint()].name,
			offset: e.varint() | 0
		});
		(r.drawOrder ??= []).push(n);
	}
	if (e.varint() !== 0) throw new Z("An unknown animation section");
	let u = e.varint();
	for (let i = 0; i < u; i++) {
		let i = e.float(), a = {
			...i ? { time: i } : {},
			name: n[e.varint()]
		}, o = e.varint(!1), s = e.float(), c = t.events[a.name] ?? {};
		o !== (c.int ?? 0) && (a.int = o), s !== (c.float ?? 0) && (a.float = s), e.bool() && (a.string = e.string()), c.audio && (a.volume = e.float(), a.balance = e.float()), (r.events ??= []).push(a);
	}
	let d = e.color();
	return d !== "ffffffff" && (r._color = d), r;
}
//#endregion
//#region src/core/state.js
var Vr = class {
	constructor(e, t, n, r, i, a) {
		this.track = e, this.animation = t, this.name = n, this.looping = r, this.mixDuration = i, this.mixTime = 0, this.delay = a, this.time = 0, this.lastTime = -1, this.fresh = !0, this.alpha = 1, this.timeScale = 1, this.previous = null, this.queue = [];
	}
	mix() {
		return this.mixDuration > 0 ? Math.min(1, this.mixTime / this.mixDuration) : 1;
	}
}, Hr = class {
	constructor() {
		this.tracks = [], this.speed = 1, this.listeners = [], this.physicsDelta = 0;
	}
	addListener(e) {
		return this.listeners.push(e), () => {
			let t = this.listeners.indexOf(e);
			t >= 0 && this.listeners.splice(t, 1);
		};
	}
	notify(e, t, n) {
		for (let r of this.listeners) r[e]?.(t, n);
	}
	play(e, t, n, r = 0) {
		return this.setAnimation(e, 0, t, n, r) !== null;
	}
	setAnimation(e, t, n, r, i = 0) {
		let a = e.animations.findIndex((e) => e.name === n);
		if (a < 0) return null;
		let o = new Vr(t, a, n, r, i, null), s = this.tracks[t];
		if (s) {
			for (let e of s.queue) this.notify("end", e);
			s.queue = [], this.replace(s, o);
		} else this.tracks[t] = o, this.notify("start", o);
		return o;
	}
	addAnimation(e, t, n, r, i = 0, a = null) {
		let o = this.tracks[t];
		if (!o) return this.setAnimation(e, t, n, r, i);
		let s = e.animations.findIndex((e) => e.name === n);
		if (s < 0) return null;
		let c = new Vr(t, s, n, r, i, a);
		return o.queue.push(c), c;
	}
	clearTrack(e) {
		let t = this.tracks[e];
		if (t) {
			for (let e of [
				t.previous,
				t,
				...t.queue
			]) e && this.notify("end", e);
			this.tracks[e] = void 0;
		}
	}
	stop() {
		this.tracks.forEach((e, t) => this.clearTrack(t)), this.tracks = [];
	}
	get current() {
		return this.tracks[0] ?? null;
	}
	currentTime() {
		return this.current ? this.current.time : null;
	}
	replace(e, t) {
		e.previous && this.notify("end", e.previous), e.previous = null, t.previous = t.mixDuration > 0 ? e : null, t.previous || this.notify("end", e), this.tracks[t.track] = t, this.notify("start", t);
	}
	update(e, t) {
		typeof e == "number" && ([e, t] = [null, e]), t *= this.speed, this.physicsDelta += t;
		for (let n of [...this.tracks]) {
			if (!n) continue;
			this.advance(e, n, t);
			let r = n.queue[0];
			if (r && e) {
				let t = e.animations[n.animation], i = r.delay ?? Math.max(0, (t?.duration ?? 0) - r.mixDuration);
				n.time >= i && (n.queue.shift(), r.queue = n.queue, n.queue = [], r.time = Math.max(0, n.time - i), r.mixTime = r.time, r.lastTime = -1, r.fresh = !1, this.replace(n, r), this.fireEvents(e, r));
			}
		}
	}
	advance(e, t, n) {
		let r = n * t.timeScale;
		t.lastTime = t.fresh ? -1 : t.time, t.fresh = !1, t.time += r, t.mixTime += r, e && this.fireEvents(e, t), t.previous && (t.previous.lastTime = t.previous.time, t.previous.time += n * t.previous.timeScale, e && this.fireEvents(e, t.previous), t.mixTime >= t.mixDuration && (this.notify("end", t.previous), t.previous = null));
	}
	fireEvents(e, t) {
		let n = e.animations[t.animation];
		if (!n) return;
		let r = n.duration, i = t.lastTime, a = t.time;
		if (a < i) return;
		let o = (r, i, a) => {
			for (let o of n.events) o.time > r && o.time <= i && this.notify("event", t, Ur(e, o, a));
		};
		if (!t.looping || r <= 0) {
			o(i, Math.min(a, r), 0), i < r && a >= r && this.notify("complete", t);
			return;
		}
		let s = Math.floor(Math.max(i, 0) / r), c = Math.floor(a / r);
		for (let e = s; e <= c; e++) o(e === s ? i - e * r : -1, e === c ? a - e * r : r, e), e < c && this.notify("complete", t);
	}
	apply(e, t) {
		t.reset(e), t.physicsDelta = this.physicsDelta, this.physicsDelta = 0;
		for (let n of this.tracks) {
			if (!n) continue;
			let r = n.track === 0 ? 1 : n.alpha;
			n.previous && Gr(e, t, n.previous, r * n.previous.alpha), Gr(e, t, n, (n.previous ? n.mix() : 1) * (n.track === 0 ? n.alpha : r));
		}
		t.updateWorld(e);
	}
};
function Ur(e, t, n) {
	let r = e.events.find((e) => e.name === t.name) ?? {};
	return {
		name: t.name,
		time: t.time,
		loop: n,
		int: t.int ?? r.int ?? 0,
		float: t.float ?? r.float ?? 0,
		string: t.string ?? r.string ?? null,
		audio: r.audio ?? null,
		volume: t.volume ?? r.volume ?? 1,
		balance: t.balance ?? r.balance ?? 0
	};
}
function Wr(e, t) {
	return (e % t + t) % t;
}
function Gr(e, t, n, r) {
	let i = e.animations[n.animation];
	if (!i || r <= 0) return;
	let a = n.looping && i.duration > 0 ? Wr(n.time, i.duration) : Math.min(n.time, i.duration);
	t.apply(e, i, a, Math.min(1, r));
}
//#endregion
//#region src/core/draw.js
var Kr = [
	0,
	1,
	2,
	0,
	2,
	3
], qr = (e, t, n) => (n[0] = e, n[1] = t, n);
function Jr(e, t, n, r) {
	let a = i(t), o = Math.max(1, a.originalWidth), s = Math.max(1, a.originalHeight), { x: c, y: l, width: u, height: d } = a.dst, f = -a.rotate * Math.PI / 180, p = Math.round(Math.cos(f) * 1e6) / 1e6, m = Math.round(Math.sin(f) * 1e6) / 1e6, h = a.src.width / 2, g = a.src.height / 2;
	return {
		tex: e,
		trim: [
			c / o,
			l / s,
			(c + u) / o,
			(l + d) / s
		],
		map(e, t, i) {
			let f = Math.min(u, Math.max(0, e * o - c)) - u / 2, _ = Math.min(d, Math.max(0, t * s - l)) - d / 2;
			return i[0] = (a.src.x + h + f * p - _ * m) / n, i[1] = (a.src.y + g + f * m + _ * p) / r, i;
		}
	};
}
function Yr(e, t) {
	let n = /* @__PURE__ */ new Map();
	for (let r of e.pages) {
		let e = t(r);
		if (!e) continue;
		let i = r.width || e.width || 1, a = r.height || e.height || 1;
		for (let t of r.regions) n.set(t.index >= 0 ? `${t.name}${t.index}` : t.name, Jr(e, t, i, a));
	}
	return (e) => n.get(e) ?? null;
}
function Xr(e) {
	let t = /* @__PURE__ */ new Map();
	for (let [n, r] of e instanceof Map ? e : Object.entries(e)) t.set(n, {
		tex: r,
		trim: [
			0,
			0,
			1,
			1
		],
		map: qr
	});
	return (e) => t.get(e) ?? null;
}
function Zr(e, t, n, r, i) {
	let a = i.uvs.get(r.weights);
	if (!a) {
		let e = [];
		for (let t of r.weights) {
			e.push(t.length);
			for (let n of t) e.push(n.bone, n.x, n.y, n.weight);
		}
		i.uvs.set(r.weights, a = Float64Array.from(e));
	}
	let o = e.deformOf(t, n), s = e.world, c = i.positions, l = r.weights.length;
	c.length = l * 2;
	let u = 0, d = 0;
	for (let e = 0; e < l; e++) {
		let t = a[u++], n = 0, r = 0;
		for (let e = 0; e < t; e++, u += 4, d += 2) {
			let e = s[a[u]], t = o ? a[u + 1] + o[d] : a[u + 1], i = o ? a[u + 2] + o[d + 1] : a[u + 2], c = a[u + 3];
			n += (e.a * t + e.c * i + e.tx) * c, r += (e.b * t + e.d * i + e.ty) * c;
		}
		c[2 * e] = n, c[2 * e + 1] = r;
	}
	return c;
}
function Qr(e, t, n, r) {
	let i = e.uvs.get(t);
	return (!i || i.entry !== n) && e.uvs.set(t, i = {
		entry: n,
		uvs: r()
	}), i.uvs;
}
function $r(e, t, n, r, { tint: i = [
	1,
	1,
	1,
	1
], skip: a = null, between: o = null, cache: s = null } = {}) {
	let c = null, l = null, u = [0, 0];
	for (let d of t.drawOrder) {
		let f = e.slots[d];
		o?.(d);
		let p = f ? t.slotAttachment(e, d) : null, m = p ? p.type ?? "region" : null;
		p && m === "clipping" && !a?.(d, p) ? (c = new he(t.worldVertices(e, d, p)), l = p.end === d ? null : p.end ?? null) : p && (m === "region" || m === "mesh" || m === "linkedmesh") && !a?.(d, p) && ti(e, t, d, p, m, n, i, c, u, r, s), c && l === d && (c = null);
	}
}
var ei = [
	[0, 0],
	[1, 0],
	[1, 1],
	[0, 1]
];
function ti(e, t, n, r, i, a, o, s, c, l, u) {
	let d = i === "region" ? r : e.meshSource(n, r);
	if (!d) return;
	let f = a(t.imageOf(n, i === "mesh" ? d : r));
	if (!f) return;
	let p = t.color[n], m = r.color ?? [
		1,
		1,
		1,
		1
	], h = u ? u.light : [
		0,
		0,
		0,
		0
	];
	h[0] = p[0] * m[0] * o[0], h[1] = p[1] * m[1] * o[1], h[2] = p[2] * m[2] * o[2], h[3] = p[3] * m[3] * o[3];
	let g = t.dark[n], _ = e.slots[n].blend ?? "normal", v, y, b;
	if (i === "region") {
		let i = t.attachmentWorld(e, n, r), [a, o, s, l] = f.trim, d = r.width / 2, p = r.height / 2;
		v = u ? u.positions : [], v.length = 8;
		for (let e = 0; e < 4; e++) {
			let t = ei[e][0] ? s : a, n = ei[e][1] ? l : o, c = -d + t * r.width, u = p - n * r.height;
			v[2 * e] = i.a * c + i.c * u + i.tx, v[2 * e + 1] = i.b * c + i.d * u + i.ty;
		}
		let m = () => {
			let e = Array(8);
			for (let t = 0; t < 4; t++) f.map(ei[t][0] ? s : a, ei[t][1] ? l : o, c), e[2 * t] = c[0], e[2 * t + 1] = c[1];
			return e;
		};
		y = u ? Qr(u, r, f, m) : m(), b = Kr;
	} else {
		v = u && d.weights ? Zr(t, n, r, d, u) : t.worldVertices(e, n, r, u ? u.positions : void 0);
		let i = v.length / 2, a = () => {
			let e = Array(i * 2);
			for (let t = 0; t < i; t++) f.map(d.uvs[2 * t], d.uvs[2 * t + 1], c), e[2 * t] = c[0], e[2 * t + 1] = c[1];
			return e;
		};
		y = u ? Qr(u, d.uvs, f, a) : a(), b = d.triangles;
	}
	s ? s.clip(v, y, b, (e, t, n) => l(f.tex, _, e, t, n, h, g)) : l(f.tex, _, v, y, b, h, g);
}
//#endregion
//#region src/webgl/renderer.js
var ni = 12, ri = 65535, ii = "\nattribute vec2 a_position;\nattribute vec2 a_uv;\nattribute vec4 a_light;\nattribute vec4 a_dark;\nuniform mat3 u_projection;\nvarying vec2 v_uv;\nvarying vec4 v_light;\nvarying vec4 v_dark;\nvoid main() {\n  v_uv = a_uv;\n  v_light = a_light;\n  v_dark = a_dark;\n  gl_Position = vec4((u_projection * vec3(a_position, 1.0)).xy, 0.0, 1.0);\n}", ai = "\nprecision mediump float;\nuniform sampler2D u_texture;\nuniform float u_pma;\nvarying vec2 v_uv;\nvarying vec4 v_light;\nvarying vec4 v_dark;\nvoid main() {\n  vec4 t = texture2D(u_texture, v_uv);\n  vec3 c = u_pma > 0.5 ? (t.a > 0.0 ? t.rgb / t.a : vec3(0.0)) : t.rgb;\n  float a = t.a * v_light.a;\n  vec3 rgb = c * v_light.rgb + (1.0 - c) * v_dark.rgb * v_dark.a;\n  gl_FragColor = vec4(rgb * a, a);\n}", oi = {
	normal: ["ONE", "ONE_MINUS_SRC_ALPHA"],
	additive: ["ONE", "ONE"],
	multiply: ["DST_COLOR", "ONE_MINUS_SRC_ALPHA"],
	screen: ["ONE", "ONE_MINUS_SRC_COLOR"]
};
function si(e, t, n) {
	let r = e.createShader(t);
	if (e.shaderSource(r, n), e.compileShader(r), !e.getShaderParameter(r, e.COMPILE_STATUS)) throw Error(`shader: ${e.getShaderInfoLog(r)}`);
	return r;
}
var ci = class {
	constructor(e) {
		this.gl = e;
		let t = e.createProgram();
		if (e.attachShader(t, si(e, e.VERTEX_SHADER, ii)), e.attachShader(t, si(e, e.FRAGMENT_SHADER, ai)), e.linkProgram(t), !e.getProgramParameter(t, e.LINK_STATUS)) throw Error(`program: ${e.getProgramInfoLog(t)}`);
		this.program = t, this.attributes = [
			"a_position",
			"a_uv",
			"a_light",
			"a_dark"
		].map((n) => e.getAttribLocation(t, n)), this.uniforms = {
			projection: e.getUniformLocation(t, "u_projection"),
			texture: e.getUniformLocation(t, "u_texture"),
			pma: e.getUniformLocation(t, "u_pma")
		}, this.vertices = new Float32Array(ri * ni), this.indices = new Uint16Array(ri * 3), this.vertexBuffer = e.createBuffer(), this.indexBuffer = e.createBuffer(), this.vertexCount = 0, this.indexCount = 0, this.texture = null, this.blend = null, this.drawCalls = 0, this.drawing = !1;
	}
	createTexture(e, { pma: t = !1, linear: n = !0, mipmaps: r = !1 } = {}) {
		let i = this.gl, a = i.createTexture();
		i.bindTexture(i.TEXTURE_2D, a);
		let o = i.getParameter(i.UNPACK_FLIP_Y_WEBGL), s = i.getParameter(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL);
		i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL, !1), i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL, !1), i.texImage2D(i.TEXTURE_2D, 0, i.RGBA, i.RGBA, i.UNSIGNED_BYTE, e), i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL, o), i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL, s);
		let c = n ? i.LINEAR : i.NEAREST;
		i.texParameteri(i.TEXTURE_2D, i.TEXTURE_MAG_FILTER, c);
		let l = (e) => !(e & e - 1), u = r && (i instanceof (globalThis.WebGL2RenderingContext ?? Object) || l(e.width) && l(e.height));
		return u && i.generateMipmap(i.TEXTURE_2D), i.texParameteri(i.TEXTURE_2D, i.TEXTURE_MIN_FILTER, u ? i.LINEAR_MIPMAP_LINEAR : c), i.texParameteri(i.TEXTURE_2D, i.TEXTURE_WRAP_S, i.CLAMP_TO_EDGE), i.texParameteri(i.TEXTURE_2D, i.TEXTURE_WRAP_T, i.CLAMP_TO_EDGE), {
			texture: a,
			width: e.width,
			height: e.height,
			pma: t
		};
	}
	atlasTextures(e, t) {
		return Yr(e, (e) => {
			let n = t instanceof Map ? t.get(e.name) : t[e.name];
			return n ? this.createTexture(n, {
				pma: e.pma,
				linear: !e.filter?.[0]?.startsWith("Nearest")
			}) : null;
		});
	}
	imageTextures(e, t = {}) {
		let n = /* @__PURE__ */ new Map();
		for (let [r, i] of e instanceof Map ? e : Object.entries(e)) n.set(r, this.createTexture(i, t));
		return Xr(n);
	}
	begin(e, t, n = {
		x: 0,
		y: 0,
		zoom: 1
	}) {
		let r = 2 * n.zoom / e, i = 2 * n.zoom / t;
		this.beginMatrix([
			r,
			0,
			0,
			0,
			i,
			0,
			-n.x * r,
			-n.y * i,
			1
		]);
	}
	beginMatrix(e) {
		let t = this.gl;
		t.useProgram(this.program), t.uniformMatrix3fv(this.uniforms.projection, !1, new Float32Array(e)), t.uniform1i(this.uniforms.texture, 0), t.enable(t.BLEND), t.disable(t.DEPTH_TEST), t.disable(t.CULL_FACE), this.texture = null, this.blend = null, this.drawCalls = 0, this.drawing = !0;
	}
	end() {
		this.flush(), this.drawing = !1;
	}
	drawSkeleton(e, t, n, r = {}) {
		$r(e, t, n, (e, t, n, r, i, a, o) => {
			this.use(e, t), this.emit(n, r, i, a, o);
		}, r);
	}
	emit(e, t, n, r, i) {
		let a = e.length / 2;
		if (!this.reserve(a, n.length)) return;
		let o = this.vertexCount;
		for (let n = 0; n < a; n++) this.vertex(e[2 * n], e[2 * n + 1], t[2 * n], t[2 * n + 1], r, i);
		for (let e = 0; e < n.length; e++) this.indices[this.indexCount++] = o + n[e];
	}
	line(e, t, n, r, i, a) {
		let o = n - e, s = r - t, c = Math.hypot(o, s);
		if (c < 1e-9) return;
		let l = -s / c * (i / 2), u = o / c * (i / 2);
		if (this.use(this.white(), "normal"), !this.reserve(4, 6)) return;
		let d = this.vertexCount;
		this.vertex(e + l, t + u, .5, .5, a, null), this.vertex(n + l, r + u, .5, .5, a, null), this.vertex(n - l, r - u, .5, .5, a, null), this.vertex(e - l, t - u, .5, .5, a, null), this.index(d, d + 1, d + 2, d, d + 2, d + 3);
	}
	white() {
		if (!this.whiteTexture) {
			let e = this.gl, t = e.createTexture();
			e.bindTexture(e.TEXTURE_2D, t), e.texImage2D(e.TEXTURE_2D, 0, e.RGBA, 1, 1, 0, e.RGBA, e.UNSIGNED_BYTE, new Uint8Array([
				255,
				255,
				255,
				255
			])), e.texParameteri(e.TEXTURE_2D, e.TEXTURE_MIN_FILTER, e.NEAREST), e.texParameteri(e.TEXTURE_2D, e.TEXTURE_MAG_FILTER, e.NEAREST), this.whiteTexture = {
				texture: t,
				width: 1,
				height: 1,
				pma: !1
			};
		}
		return this.whiteTexture;
	}
	deleteTexture(e) {
		this.texture === e && this.flush(), this.gl.deleteTexture(e.texture);
	}
	use(e, t) {
		(this.texture !== e || this.blend !== t) && (this.flush(), this.texture = e, this.blend = t);
	}
	reserve(e, t) {
		return e > ri || t > this.indices.length ? !1 : ((this.vertexCount + e > ri || this.indexCount + t > this.indices.length) && this.flush(), !0);
	}
	vertex(e, t, n, r, i, a) {
		let o = this.vertexCount++ * ni, s = this.vertices;
		s[o] = e, s[o + 1] = t, s[o + 2] = n, s[o + 3] = r, s[o + 4] = i[0], s[o + 5] = i[1], s[o + 6] = i[2], s[o + 7] = i[3], s[o + 8] = a ? a[0] : 0, s[o + 9] = a ? a[1] : 0, s[o + 10] = a ? a[2] : 0, s[o + 11] = +!!a;
	}
	index(...e) {
		for (let t of e) this.indices[this.indexCount++] = t;
	}
	flush() {
		if (!this.indexCount || !this.texture) {
			this.vertexCount = 0, this.indexCount = 0;
			return;
		}
		let e = this.gl;
		e.activeTexture(e.TEXTURE0), e.bindTexture(e.TEXTURE_2D, this.texture.texture), e.uniform1f(this.uniforms.pma, +!!this.texture.pma);
		let [t, n] = oi[this.blend] ?? oi.normal;
		e.blendFunc(e[t], e[n]), e.bindBuffer(e.ARRAY_BUFFER, this.vertexBuffer), e.bufferData(e.ARRAY_BUFFER, this.vertices.subarray(0, this.vertexCount * ni), e.DYNAMIC_DRAW), e.bindBuffer(e.ELEMENT_ARRAY_BUFFER, this.indexBuffer), e.bufferData(e.ELEMENT_ARRAY_BUFFER, this.indices.subarray(0, this.indexCount), e.DYNAMIC_DRAW);
		let r = [
			2,
			2,
			4,
			4
		], i = 0;
		this.attributes.forEach((t, n) => {
			t >= 0 && (e.enableVertexAttribArray(t), e.vertexAttribPointer(t, r[n], e.FLOAT, !1, 48, i * 4)), i += r[n];
		}), e.drawElements(e.TRIANGLES, this.indexCount, e.UNSIGNED_SHORT, 0), this.drawCalls++, this.vertexCount = 0, this.indexCount = 0;
	}
	dispose() {
		let e = this.gl;
		e.deleteBuffer(this.vertexBuffer), e.deleteBuffer(this.indexBuffer), e.deleteProgram(this.program), this.whiteTexture && e.deleteTexture(this.whiteTexture.texture);
	}
}, $ = "rigby2d", li = new TextDecoder();
function ui(e, t) {
	let n = e.cache.custom[$]?.get(t);
	if (!n) throw Error(`Rigby2D: nothing loaded as '${t}' (this.load.rigby('${t}', skeletonUrl, atlasUrl) in preload)`);
	return n;
}
var di = (e) => e.slice(0, e.lastIndexOf("/") + 1);
function fi(e = globalThis.Phaser) {
	if (!e?.GameObjects?.Extern) throw Error("Rigby2D: pass the Phaser namespace (Phaser 3.60 or newer, or Phaser 4)");
	class n extends e.GameObjects.Extern {
		constructor(e, t, n, r, i, a = !0) {
			super(e);
			let o = ui(e, r);
			this.type = "RigbySkeleton", this.key = r, this.skeleton = o.skeleton, this.data_ = o, this.pose = new Ft(this.skeleton), this.state = new Hr(), this.timeScale = 1, this.setPosition(t, n), this.state.addListener({
				start: (e) => this.emit("start", e),
				end: (e) => this.emit("end", e),
				complete: (e) => this.emit("complete", e),
				event: (e, t) => this.emit("event", e, t)
			}), this.skeleton.skins.length && this.skeleton.skin === void 0 && (this.skeleton.skin = null), i && this.play(i, a), this.pose.setToSetup(this.skeleton), this.pose.updateWorld?.(this.skeleton), this.updateSize();
		}
		play(e, t = !0, n = 0) {
			if (!this.skeleton.animations.some((t) => t.name === e)) throw Error(`Rigby2D: '${this.key}' has no animation '${e}'`);
			return this.state.setAnimation(this.skeleton, 0, e, t, n), this.state.tracks[0];
		}
		queue(e, t = !0, n = .2, r = 0, i = null) {
			return this.state.addAnimation(this.skeleton, r, e, t, n, i);
		}
		get animationNames() {
			return this.skeleton.animations.map((e) => e.name);
		}
		get skinNames() {
			return this.skeleton.skins.map((e) => e.name);
		}
		get skin() {
			return this.skeleton.skin ?? null;
		}
		set skin(e) {
			if (e !== null && !this.skeleton.skins.some((t) => t.name === e)) throw Error(`Rigby2D: '${this.key}' has no skin '${e}'`);
			this.skeleton.skin = e;
		}
		setSkin(e) {
			return this.skin = e, this;
		}
		boneWorld(e) {
			let t = this.skeleton.bones.findIndex((t) => t.name === e), n = t >= 0 ? this.pose.world[t] : null;
			if (!n) return null;
			let [r, i] = n.apply([0, 0]), [a, o] = n.apply([1, 0]), s = this.getWorldTransformMatrix(), c = this.flipX ? -1 : 1, l = this.flipY ? -1 : 1, u = s.transformPoint(r * c, -i * l, {
				x: 0,
				y: 0
			}), d = s.transformPoint(a * c, -o * l, {
				x: 0,
				y: 0
			});
			return {
				x: u.x,
				y: u.y,
				rotation: Math.atan2(d.y - u.y, d.x - u.x)
			};
		}
		updateSize() {
			let [e, t, n, r] = [
				Infinity,
				Infinity,
				-Infinity,
				-Infinity
			];
			for (let i of this.pose.quads?.(this.skeleton) ?? []) for (let [a, o] of i.positions) e = Math.min(e, a), t = Math.min(t, -o), n = Math.max(n, a), r = Math.max(r, -o);
			return Number.isFinite(e) && (this.setSize(n - e, r - t), this.setDisplayOrigin(-e, -t), this.localBounds = {
				x: e,
				y: t,
				width: n - e,
				height: r - t
			}), this;
		}
		preUpdate(e, t) {
			let n = t / 1e3 * this.timeScale;
			this.state.update(this.skeleton, n), this.state.apply(this.skeleton, this.pose);
		}
		render(t, n, o) {
			let s = !!t.renderNodes, c = s ? n.camera : n, l = t.gl, u = t.rigby2d ??= new ci(l), d = s ? null : r(l, u.attributes), f = this.data_.textures ??= a(u, this.data_, this.scene), p = s ? n.width : t.width, m = s ? n.height : t.height, h = this.flipX ? -1 : 1, g = this.flipY ? -1 : 1, { a: _, b: v, c: y, d: b, e: ee, f: te } = o, x = _ * h, S = v * h, ne = -y * g, re = -b * g;
			u.beginMatrix([
				2 * x / p,
				-2 * S / m,
				0,
				2 * ne / p,
				-2 * re / m,
				0,
				2 * ee / p - 1,
				1 - 2 * te / m,
				1
			]), u.drawSkeleton(this.skeleton, this.pose, f, { tint: [
				1,
				1,
				1,
				this.alpha * c.alpha
			] }), u.end(), d && (i(l, d), t.setBlendMode(e.BlendModes.NORMAL, !0));
		}
		preDestroy() {
			this.state.stop(), this.state.listeners.length = 0;
		}
	}
	function r(e, t) {
		let n = (t) => e.getParameter(e[t]), r = n("ACTIVE_TEXTURE");
		return e.activeTexture(e.TEXTURE0), {
			program: n("CURRENT_PROGRAM"),
			arrayBuffer: n("ARRAY_BUFFER_BINDING"),
			elementBuffer: n("ELEMENT_ARRAY_BUFFER_BINDING"),
			active: r,
			texture: n("TEXTURE_BINDING_2D"),
			blend: e.isEnabled(e.BLEND),
			attributes: t.filter((e) => e >= 0).map((t) => ({
				loc: t,
				enabled: e.getVertexAttrib(t, e.VERTEX_ATTRIB_ARRAY_ENABLED),
				buffer: e.getVertexAttrib(t, e.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING),
				size: e.getVertexAttrib(t, e.VERTEX_ATTRIB_ARRAY_SIZE),
				type: e.getVertexAttrib(t, e.VERTEX_ATTRIB_ARRAY_TYPE),
				normalized: e.getVertexAttrib(t, e.VERTEX_ATTRIB_ARRAY_NORMALIZED),
				stride: e.getVertexAttrib(t, e.VERTEX_ATTRIB_ARRAY_STRIDE),
				offset: e.getVertexAttribOffset(t, e.VERTEX_ATTRIB_ARRAY_POINTER)
			}))
		};
	}
	function i(e, t) {
		for (let n of t.attributes) n.buffer && (e.bindBuffer(e.ARRAY_BUFFER, n.buffer), e.vertexAttribPointer(n.loc, n.size, n.type, n.normalized, n.stride, n.offset)), n.enabled ? e.enableVertexAttribArray(n.loc) : e.disableVertexAttribArray(n.loc);
		e.bindBuffer(e.ARRAY_BUFFER, t.arrayBuffer), e.bindBuffer(e.ELEMENT_ARRAY_BUFFER, t.elementBuffer), e.useProgram(t.program), e.activeTexture(e.TEXTURE0), e.bindTexture(e.TEXTURE_2D, t.texture), e.activeTexture(t.active), t.blend || e.disable(e.BLEND);
	}
	function a(e, t, n) {
		let r = /* @__PURE__ */ new Map();
		for (let [e, i] of t.pages) {
			let t = n.textures.get(i), a = t?.getSourceImage?.();
			a && t.key !== "__MISSING" && r.set(e, a);
		}
		return e.atlasTextures(t.atlas, r);
	}
	class o extends e.Plugins.ScenePlugin {
		constructor(e, t, r) {
			super(e, t, r), t.registerFileType("rigby", s, e), t.registerGameObject("rigby", function(e, t, r, i, a) {
				let o = new n(this.scene, e, t, r, i, a);
				return this.displayList.add(o), this.updateList.add(o), o;
			});
		}
		boot() {
			this.game.cache.custom[$] || this.game.cache.addCustom($);
		}
		get(e) {
			return ui(this.scene, e);
		}
	}
	function s(e, n, r) {
		let i = this, a = `${$}:${e}:skeleton`, o = `${$}:${e}:atlas`, s = null, c = null, l = () => {
			if (s === null || c === null) return;
			let l = t(c), u = Xt(xr(s) ? Cr(s) : JSON.parse(li.decode(s)), n).skeleton, d = /* @__PURE__ */ new Map();
			for (let t of l.pages) {
				let n = `${$}:${e}:page:${t.name}`;
				d.set(t.name, n), i.scene.textures.exists(n) || i.image(n, di(r) + t.name);
			}
			i.cacheManager.custom[$] || i.cacheManager.addCustom($), i.cacheManager.custom[$].add(e, {
				skeleton: u,
				atlas: l,
				pages: d,
				textures: null
			}), i.cacheManager.binary.remove(a), i.cacheManager.text.remove(o);
		};
		return i.once(`filecomplete-binary-${a}`, (e, t, n) => {
			s = new Uint8Array(n), l();
		}), i.once(`filecomplete-text-${o}`, (e, t, n) => {
			c = n, l();
		}), i.binary(a, n), i.text(o, r), i;
	}
	return {
		RigbyPlugin: o,
		RigbySkeleton: n
	};
}
//#endregion
export { fi as rigbyPhaser };
