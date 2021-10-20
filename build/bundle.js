
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    let src_url_equal_anchor;
    function src_url_equal(element_src, url) {
        if (!src_url_equal_anchor) {
            src_url_equal_anchor = document.createElement('a');
        }
        src_url_equal_anchor.href = url;
        return element_src === src_url_equal_anchor.href;
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.44.0' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src\App.svelte generated by Svelte v3.44.0 */

    const file = "src\\App.svelte";

    function create_fragment(ctx) {
    	let h10;
    	let t1;
    	let a0;
    	let br0;
    	let t3;
    	let img0;
    	let img0_src_value;
    	let t4;
    	let h11;
    	let t5;
    	let br1;
    	let t6;
    	let t7;
    	let img1;
    	let img1_src_value;
    	let t8;
    	let h12;
    	let t10;
    	let img2;
    	let img2_src_value;
    	let t11;
    	let h13;
    	let t13;
    	let img3;
    	let img3_src_value;
    	let t14;
    	let h14;
    	let t16;
    	let h3;
    	let t18;
    	let a1;
    	let t20;
    	let h15;
    	let t22;
    	let img4;
    	let img4_src_value;
    	let t23;
    	let h16;

    	const block = {
    		c: function create() {
    			h10 = element("h1");
    			h10.textContent = "SELF STUDY BY SOPHIE (water color art)!";
    			t1 = space();
    			a0 = element("a");
    			a0.textContent = "Youtube";
    			br0 = element("br");
    			t3 = space();
    			img0 = element("img");
    			t4 = space();
    			h11 = element("h1");
    			t5 = text("Hello!!! I am going to present about my work that we call it Self study. ");
    			br1 = element("br");
    			t6 = text(" This is our work at 1oth grade.");
    			t7 = space();
    			img1 = element("img");
    			t8 = space();
    			h12 = element("h1");
    			h12.textContent = "This is one of the best arts that i have on hand!!!";
    			t10 = space();
    			img2 = element("img");
    			t11 = space();
    			h13 = element("h1");
    			h13.textContent = "Some of the art work I have done is in a black tone.";
    			t13 = space();
    			img3 = element("img");
    			t14 = space();
    			h14 = element("h1");
    			h14.textContent = "And also paper cuts...and a lot more!!!!!";
    			t16 = space();
    			h3 = element("h3");
    			h3.textContent = "contact us";
    			t18 = space();
    			a1 = element("a");
    			a1.textContent = "instgram";
    			t20 = space();
    			h15 = element("h1");
    			h15.textContent = "I do art works for my self study project. I do water color art. athese are the top works that i ahve done hope you like it!!!";
    			t22 = space();
    			img4 = element("img");
    			t23 = space();
    			h16 = element("h1");
    			h16.textContent = "...more about me in instagram...";
    			add_location(h10, file, 1, 4, 5);
    			attr_dev(a0, "href", "https://www.youtube.com/");
    			add_location(a0, file, 2, 4, 59);
    			add_location(br0, file, 2, 50, 105);
    			if (!src_url_equal(img0.src, img0_src_value = "https://lh3.googleusercontent.com/a-/AOh14Gi7pvDW2A4kCnmPyfbe4N3YWTKNrJEotrlvwRLO=s83")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "");
    			set_style(img0, "width", "100px");
    			add_location(img0, file, 5, 4, 124);
    			add_location(br1, file, 13, 77, 336);
    			add_location(h11, file, 13, 0, 259);
    			if (!src_url_equal(img1.src, img1_src_value = "https://lh3.googleusercontent.com/a-/AOh14GgUjEc7Zxmfw11MbZ5ZrN8xN1Rac_JK1YpwM-yb=s83")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "");
    			set_style(img1, "width", "100px");
    			add_location(img1, file, 14, 0, 378);
    			add_location(h12, file, 15, 0, 504);
    			if (!src_url_equal(img2.src, img2_src_value = "https://lh3.googleusercontent.com/a-/AOh14GiNqHEblRYUyUH5eugrTFl48OCSv5W_ZqPRosXV=s83")) attr_dev(img2, "src", img2_src_value);
    			attr_dev(img2, "alt", "");
    			set_style(img2, "width", "100px");
    			add_location(img2, file, 16, 0, 565);
    			add_location(h13, file, 17, 0, 690);
    			if (!src_url_equal(img3.src, img3_src_value = "https://lh3.googleusercontent.com/a-/AOh14GjUwSWPhHgAIMsHC3O5PYqt6Tca9xb6gXBWMsJK=s83")) attr_dev(img3, "src", img3_src_value);
    			attr_dev(img3, "alt", "");
    			set_style(img3, "width", "100px");
    			add_location(img3, file, 18, 0, 752);
    			add_location(h14, file, 19, 0, 877);
    			add_location(h3, file, 22, 0, 930);
    			attr_dev(a1, "href", "https://www.instagram.com/yanisasoph/");
    			attr_dev(a1, "target", "_blank");
    			add_location(a1, file, 23, 0, 950);
    			add_location(h15, file, 24, 0, 1027);
    			if (!src_url_equal(img4.src, img4_src_value = "https://lh3.googleusercontent.com/a-/AOh14GgmuLIV2NyZbm4qykfrwkr2NyWjXIKFu41hSANR=s83")) attr_dev(img4, "src", img4_src_value);
    			attr_dev(img4, "alt", "");
    			set_style(img4, "width", "100px");
    			add_location(img4, file, 26, 0, 1163);
    			add_location(h16, file, 28, 0, 1289);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h10, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, a0, anchor);
    			insert_dev(target, br0, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, img0, anchor);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, h11, anchor);
    			append_dev(h11, t5);
    			append_dev(h11, br1);
    			append_dev(h11, t6);
    			insert_dev(target, t7, anchor);
    			insert_dev(target, img1, anchor);
    			insert_dev(target, t8, anchor);
    			insert_dev(target, h12, anchor);
    			insert_dev(target, t10, anchor);
    			insert_dev(target, img2, anchor);
    			insert_dev(target, t11, anchor);
    			insert_dev(target, h13, anchor);
    			insert_dev(target, t13, anchor);
    			insert_dev(target, img3, anchor);
    			insert_dev(target, t14, anchor);
    			insert_dev(target, h14, anchor);
    			insert_dev(target, t16, anchor);
    			insert_dev(target, h3, anchor);
    			insert_dev(target, t18, anchor);
    			insert_dev(target, a1, anchor);
    			insert_dev(target, t20, anchor);
    			insert_dev(target, h15, anchor);
    			insert_dev(target, t22, anchor);
    			insert_dev(target, img4, anchor);
    			insert_dev(target, t23, anchor);
    			insert_dev(target, h16, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h10);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(a0);
    			if (detaching) detach_dev(br0);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(img0);
    			if (detaching) detach_dev(t4);
    			if (detaching) detach_dev(h11);
    			if (detaching) detach_dev(t7);
    			if (detaching) detach_dev(img1);
    			if (detaching) detach_dev(t8);
    			if (detaching) detach_dev(h12);
    			if (detaching) detach_dev(t10);
    			if (detaching) detach_dev(img2);
    			if (detaching) detach_dev(t11);
    			if (detaching) detach_dev(h13);
    			if (detaching) detach_dev(t13);
    			if (detaching) detach_dev(img3);
    			if (detaching) detach_dev(t14);
    			if (detaching) detach_dev(h14);
    			if (detaching) detach_dev(t16);
    			if (detaching) detach_dev(h3);
    			if (detaching) detach_dev(t18);
    			if (detaching) detach_dev(a1);
    			if (detaching) detach_dev(t20);
    			if (detaching) detach_dev(h15);
    			if (detaching) detach_dev(t22);
    			if (detaching) detach_dev(img4);
    			if (detaching) detach_dev(t23);
    			if (detaching) detach_dev(h16);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    var app = new App({
    	target: document.body
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
