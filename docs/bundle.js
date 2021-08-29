
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
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
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
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
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

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
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
            context: new Map(parent_component ? parent_component.$$.context : options.context || []),
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
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.42.3' }, detail), true));
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
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
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

    /* src/App.svelte generated by Svelte v3.42.3 */

    const { console: console_1 } = globals;
    const file = "src/App.svelte";

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[32] = list[i];
    	return child_ctx;
    }

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[29] = list[i];
    	child_ctx[30] = list;
    	child_ctx[31] = i;
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[29] = list[i];
    	return child_ctx;
    }

    function get_each_context_3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[32] = list[i];
    	return child_ctx;
    }

    // (240:2) {#if edgeMode}
    function create_if_block_4(ctx) {
    	let line;
    	let line_x__value;
    	let line_y__value;
    	let line_x__value_1;
    	let line_y__value_1;

    	const block = {
    		c: function create() {
    			line = svg_element("line");
    			attr_dev(line, "x1", line_x__value = /*edgeStartVertex*/ ctx[3].position[0]);
    			attr_dev(line, "y1", line_y__value = /*edgeStartVertex*/ ctx[3].position[1]);
    			attr_dev(line, "x2", line_x__value_1 = /*edgeEndVertexPos*/ ctx[4][0]);
    			attr_dev(line, "y2", line_y__value_1 = /*edgeEndVertexPos*/ ctx[4][1]);
    			attr_dev(line, "stroke", "black");
    			add_location(line, file, 240, 3, 6660);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, line, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*edgeStartVertex*/ 8 && line_x__value !== (line_x__value = /*edgeStartVertex*/ ctx[3].position[0])) {
    				attr_dev(line, "x1", line_x__value);
    			}

    			if (dirty[0] & /*edgeStartVertex*/ 8 && line_y__value !== (line_y__value = /*edgeStartVertex*/ ctx[3].position[1])) {
    				attr_dev(line, "y1", line_y__value);
    			}

    			if (dirty[0] & /*edgeEndVertexPos*/ 16 && line_x__value_1 !== (line_x__value_1 = /*edgeEndVertexPos*/ ctx[4][0])) {
    				attr_dev(line, "x2", line_x__value_1);
    			}

    			if (dirty[0] & /*edgeEndVertexPos*/ 16 && line_y__value_1 !== (line_y__value_1 = /*edgeEndVertexPos*/ ctx[4][1])) {
    				attr_dev(line, "y2", line_y__value_1);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(line);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(240:2) {#if edgeMode}",
    		ctx
    	});

    	return block;
    }

    // (273:4) {:else}
    function create_else_block(ctx) {
    	let rect;

    	const block = {
    		c: function create() {
    			rect = svg_element("rect");
    			attr_dev(rect, "x", "-30");
    			attr_dev(rect, "y", "-15");
    			attr_dev(rect, "width", "60");
    			attr_dev(rect, "height", "30");
    			attr_dev(rect, "fill", "#ffffff");
    			attr_dev(rect, "stroke", "#000000");
    			add_location(rect, file, 273, 5, 7254);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, rect, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(rect);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(273:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (264:4) {#if selected === edge}
    function create_if_block_3(ctx) {
    	let rect;

    	const block = {
    		c: function create() {
    			rect = svg_element("rect");
    			attr_dev(rect, "x", "-30");
    			attr_dev(rect, "y", "-15");
    			attr_dev(rect, "width", "60");
    			attr_dev(rect, "height", "30");
    			attr_dev(rect, "fill", "#ffffff");
    			attr_dev(rect, "stroke", "orange");
    			add_location(rect, file, 264, 5, 7117);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, rect, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(rect);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(264:4) {#if selected === edge}",
    		ctx
    	});

    	return block;
    }

    // (250:2) {#each graph.edges as edge}
    function create_each_block_3(ctx) {
    	let line;
    	let line_x__value;
    	let line_y__value;
    	let line_x__value_1;
    	let line_y__value_1;
    	let g;
    	let text0;
    	let t0_value = /*edge*/ ctx[32].name + "";
    	let t0;
    	let text1;
    	let t1_value = /*edge*/ ctx[32].weight + "";
    	let t1;
    	let g_transform_value;
    	let mounted;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (/*selected*/ ctx[1] === /*edge*/ ctx[32]) return create_if_block_3;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	function click_handler(...args) {
    		return /*click_handler*/ ctx[15](/*edge*/ ctx[32], ...args);
    	}

    	const block = {
    		c: function create() {
    			line = svg_element("line");
    			g = svg_element("g");
    			if_block.c();
    			text0 = svg_element("text");
    			t0 = text(t0_value);
    			text1 = svg_element("text");
    			t1 = text(t1_value);
    			attr_dev(line, "x1", line_x__value = /*edge*/ ctx[32].x1);
    			attr_dev(line, "y1", line_y__value = /*edge*/ ctx[32].y1);
    			attr_dev(line, "x2", line_x__value_1 = /*edge*/ ctx[32].x2);
    			attr_dev(line, "y2", line_y__value_1 = /*edge*/ ctx[32].y2);
    			attr_dev(line, "stroke", "black");
    			add_location(line, file, 250, 3, 6865);
    			attr_dev(text0, "y", "-30");
    			attr_dev(text0, "text-anchor", "middle");
    			attr_dev(text0, "dominant-baseline", "central");
    			add_location(text0, file, 282, 4, 7389);
    			attr_dev(text1, "text-anchor", "middle");
    			attr_dev(text1, "dominant-baseline", "central");
    			add_location(text1, file, 285, 4, 7486);
    			attr_dev(g, "transform", g_transform_value = "translate(" + /*edge*/ ctx[32].centerX + "," + /*edge*/ ctx[32].centerY + ")");
    			add_location(g, file, 257, 3, 6967);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, line, anchor);
    			insert_dev(target, g, anchor);
    			if_block.m(g, null);
    			append_dev(g, text0);
    			append_dev(text0, t0);
    			append_dev(g, text1);
    			append_dev(text1, t1);

    			if (!mounted) {
    				dispose = listen_dev(g, "click", click_handler, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty[0] & /*graph*/ 64 && line_x__value !== (line_x__value = /*edge*/ ctx[32].x1)) {
    				attr_dev(line, "x1", line_x__value);
    			}

    			if (dirty[0] & /*graph*/ 64 && line_y__value !== (line_y__value = /*edge*/ ctx[32].y1)) {
    				attr_dev(line, "y1", line_y__value);
    			}

    			if (dirty[0] & /*graph*/ 64 && line_x__value_1 !== (line_x__value_1 = /*edge*/ ctx[32].x2)) {
    				attr_dev(line, "x2", line_x__value_1);
    			}

    			if (dirty[0] & /*graph*/ 64 && line_y__value_1 !== (line_y__value_1 = /*edge*/ ctx[32].y2)) {
    				attr_dev(line, "y2", line_y__value_1);
    			}

    			if (current_block_type !== (current_block_type = select_block_type(ctx))) {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(g, text0);
    				}
    			}

    			if (dirty[0] & /*graph*/ 64 && t0_value !== (t0_value = /*edge*/ ctx[32].name + "")) set_data_dev(t0, t0_value);
    			if (dirty[0] & /*graph*/ 64 && t1_value !== (t1_value = /*edge*/ ctx[32].weight + "")) set_data_dev(t1, t1_value);

    			if (dirty[0] & /*graph*/ 64 && g_transform_value !== (g_transform_value = "translate(" + /*edge*/ ctx[32].centerX + "," + /*edge*/ ctx[32].centerY + ")")) {
    				attr_dev(g, "transform", g_transform_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(line);
    			if (detaching) detach_dev(g);
    			if_block.d();
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_3.name,
    		type: "each",
    		source: "(250:2) {#each graph.edges as edge}",
    		ctx
    	});

    	return block;
    }

    // (291:2) {#each graph.vertices as vertex}
    function create_each_block_2(ctx) {
    	let g;
    	let circle;
    	let circle_fill_value;
    	let circle_stroke_value;
    	let text0;
    	let t0;
    	let t1_value = /*vertex*/ ctx[29].index + "";
    	let t1;
    	let text1;
    	let t2_value = /*vertex*/ ctx[29].weight + "";
    	let t2;
    	let g_transform_value;
    	let mounted;
    	let dispose;

    	function mousedown_handler(...args) {
    		return /*mousedown_handler*/ ctx[16](/*vertex*/ ctx[29], ...args);
    	}

    	function mouseup_handler(...args) {
    		return /*mouseup_handler*/ ctx[17](/*vertex*/ ctx[29], ...args);
    	}

    	const block = {
    		c: function create() {
    			g = svg_element("g");
    			circle = svg_element("circle");
    			text0 = svg_element("text");
    			t0 = text("q");
    			t1 = text(t1_value);
    			text1 = svg_element("text");
    			t2 = text(t2_value);
    			attr_dev(circle, "cx", "0");
    			attr_dev(circle, "cy", "0");
    			attr_dev(circle, "r", "30");
    			attr_dev(circle, "fill", circle_fill_value = /*vertex*/ ctx[29].value === 0 ? "white" : "#99c0ff");

    			attr_dev(circle, "stroke", circle_stroke_value = /*selected*/ ctx[1] === /*vertex*/ ctx[29]
    			? "orange"
    			: "black");

    			add_location(circle, file, 298, 4, 7811);
    			attr_dev(text0, "y", "-40");
    			attr_dev(text0, "text-anchor", "middle");
    			attr_dev(text0, "dominant-baseline", "central");
    			add_location(text0, file, 306, 4, 7975);
    			attr_dev(text1, "text-anchor", "middle");
    			attr_dev(text1, "dominant-baseline", "central");
    			add_location(text1, file, 309, 4, 8076);
    			attr_dev(g, "transform", g_transform_value = "translate(" + /*vertex*/ ctx[29].position[0] + "," + /*vertex*/ ctx[29].position[1] + ")");
    			add_location(g, file, 291, 3, 7629);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, g, anchor);
    			append_dev(g, circle);
    			append_dev(g, text0);
    			append_dev(text0, t0);
    			append_dev(text0, t1);
    			append_dev(g, text1);
    			append_dev(text1, t2);

    			if (!mounted) {
    				dispose = [
    					listen_dev(g, "mousedown", mousedown_handler, false, false, false),
    					listen_dev(g, "mouseup", mouseup_handler, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty[0] & /*graph*/ 64 && circle_fill_value !== (circle_fill_value = /*vertex*/ ctx[29].value === 0 ? "white" : "#99c0ff")) {
    				attr_dev(circle, "fill", circle_fill_value);
    			}

    			if (dirty[0] & /*selected, graph*/ 66 && circle_stroke_value !== (circle_stroke_value = /*selected*/ ctx[1] === /*vertex*/ ctx[29]
    			? "orange"
    			: "black")) {
    				attr_dev(circle, "stroke", circle_stroke_value);
    			}

    			if (dirty[0] & /*graph*/ 64 && t1_value !== (t1_value = /*vertex*/ ctx[29].index + "")) set_data_dev(t1, t1_value);
    			if (dirty[0] & /*graph*/ 64 && t2_value !== (t2_value = /*vertex*/ ctx[29].weight + "")) set_data_dev(t2, t2_value);

    			if (dirty[0] & /*graph*/ 64 && g_transform_value !== (g_transform_value = "translate(" + /*vertex*/ ctx[29].position[0] + "," + /*vertex*/ ctx[29].position[1] + ")")) {
    				attr_dev(g, "transform", g_transform_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(g);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2.name,
    		type: "each",
    		source: "(291:2) {#each graph.vertices as vertex}",
    		ctx
    	});

    	return block;
    }

    // (316:2) {#if dragNewVertexPos}
    function create_if_block_2(ctx) {
    	let circle;
    	let circle_cx_value;
    	let circle_cy_value;

    	const block = {
    		c: function create() {
    			circle = svg_element("circle");
    			attr_dev(circle, "cx", circle_cx_value = /*dragNewVertexPos*/ ctx[0][0]);
    			attr_dev(circle, "cy", circle_cy_value = /*dragNewVertexPos*/ ctx[0][1]);
    			attr_dev(circle, "r", "30");
    			attr_dev(circle, "fill", "#ffffff");
    			attr_dev(circle, "stroke", "black");
    			add_location(circle, file, 316, 3, 8212);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, circle, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*dragNewVertexPos*/ 1 && circle_cx_value !== (circle_cx_value = /*dragNewVertexPos*/ ctx[0][0])) {
    				attr_dev(circle, "cx", circle_cx_value);
    			}

    			if (dirty[0] & /*dragNewVertexPos*/ 1 && circle_cy_value !== (circle_cy_value = /*dragNewVertexPos*/ ctx[0][1])) {
    				attr_dev(circle, "cy", circle_cy_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(circle);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(316:2) {#if dragNewVertexPos}",
    		ctx
    	});

    	return block;
    }

    // (389:45) 
    function create_if_block_1(ctx) {
    	let p;
    	let t1;
    	let table;
    	let thead;
    	let th0;
    	let t3;
    	let th1;
    	let t5;
    	let th2;
    	let t7;
    	let th3;
    	let t9;
    	let tbody;
    	let each_value_1 = /*graph*/ ctx[6].edges;
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "相互作用";
    			t1 = space();
    			table = element("table");
    			thead = element("thead");
    			th0 = element("th");
    			th0.textContent = "Edge";
    			t3 = space();
    			th1 = element("th");
    			th1.textContent = "重み";
    			t5 = space();
    			th2 = element("th");
    			th2.textContent = "(A, B)";
    			t7 = space();
    			th3 = element("th");
    			th3.textContent = "(A × B)";
    			t9 = space();
    			tbody = element("tbody");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			add_location(p, file, 389, 4, 9693);
    			attr_dev(th0, "class", "svelte-4kaswy");
    			add_location(th0, file, 392, 6, 9736);
    			attr_dev(th1, "class", "svelte-4kaswy");
    			add_location(th1, file, 393, 6, 9756);
    			attr_dev(th2, "class", "svelte-4kaswy");
    			add_location(th2, file, 394, 6, 9774);
    			attr_dev(th3, "class", "svelte-4kaswy");
    			add_location(th3, file, 395, 6, 9796);
    			add_location(thead, file, 391, 5, 9722);
    			add_location(tbody, file, 397, 5, 9832);
    			attr_dev(table, "class", "svelte-4kaswy");
    			add_location(table, file, 390, 4, 9709);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, table, anchor);
    			append_dev(table, thead);
    			append_dev(thead, th0);
    			append_dev(thead, t3);
    			append_dev(thead, th1);
    			append_dev(thead, t5);
    			append_dev(thead, th2);
    			append_dev(thead, t7);
    			append_dev(thead, th3);
    			append_dev(table, t9);
    			append_dev(table, tbody);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(tbody, null);
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*graph, selected, inputVertexChange*/ 1090) {
    				each_value_1 = /*graph*/ ctx[6].edges;
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(tbody, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(table);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(389:45) ",
    		ctx
    	});

    	return block;
    }

    // (347:3) {#if selectedInspectorTab === "vertex"}
    function create_if_block(ctx) {
    	let p;
    	let t1;
    	let table;
    	let thead;
    	let th0;
    	let t3;
    	let th1;
    	let t5;
    	let th2;
    	let t7;
    	let th3;
    	let t9;
    	let tbody;
    	let each_value = /*graph*/ ctx[6].vertices;
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "単独作用";
    			t1 = space();
    			table = element("table");
    			thead = element("thead");
    			th0 = element("th");
    			th0.textContent = "Q";
    			t3 = space();
    			th1 = element("th");
    			th1.textContent = "重み";
    			t5 = space();
    			th2 = element("th");
    			th2.textContent = "ビット";
    			t7 = space();
    			th3 = element("th");
    			th3.textContent = "切り替え";
    			t9 = space();
    			tbody = element("tbody");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			add_location(p, file, 347, 4, 8798);
    			attr_dev(th0, "class", "svelte-4kaswy");
    			add_location(th0, file, 350, 6, 8841);
    			attr_dev(th1, "class", "svelte-4kaswy");
    			add_location(th1, file, 351, 6, 8858);
    			attr_dev(th2, "class", "svelte-4kaswy");
    			add_location(th2, file, 352, 6, 8876);
    			attr_dev(th3, "class", "svelte-4kaswy");
    			add_location(th3, file, 353, 6, 8895);
    			add_location(thead, file, 349, 5, 8827);
    			add_location(tbody, file, 355, 5, 8928);
    			attr_dev(table, "class", "svelte-4kaswy");
    			add_location(table, file, 348, 4, 8814);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, table, anchor);
    			append_dev(table, thead);
    			append_dev(thead, th0);
    			append_dev(thead, t3);
    			append_dev(thead, th1);
    			append_dev(thead, t5);
    			append_dev(thead, th2);
    			append_dev(thead, t7);
    			append_dev(thead, th3);
    			append_dev(table, t9);
    			append_dev(table, tbody);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(tbody, null);
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*graph, selected, inputVertexChange*/ 1090) {
    				each_value = /*graph*/ ctx[6].vertices;
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(tbody, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(table);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(347:3) {#if selectedInspectorTab === \\\"vertex\\\"}",
    		ctx
    	});

    	return block;
    }

    // (399:6) {#each graph.edges as edge}
    function create_each_block_1(ctx) {
    	let tr;
    	let td0;
    	let t0_value = /*edge*/ ctx[32].name + "";
    	let t0;
    	let t1;
    	let td1;
    	let input;
    	let input_value_value;
    	let t2;
    	let td2;
    	let t3;
    	let t4_value = /*edge*/ ctx[32].vertices[0].value + "";
    	let t4;
    	let t5;
    	let t6_value = /*edge*/ ctx[32].vertices[1].value + "";
    	let t6;
    	let t7;
    	let t8;
    	let td3;
    	let t9_value = /*edge*/ ctx[32].vertices[0].value * /*edge*/ ctx[32].vertices[1].value + "";
    	let t9;
    	let t10;
    	let mounted;
    	let dispose;

    	function input_handler_1(...args) {
    		return /*input_handler_1*/ ctx[23](/*edge*/ ctx[32], ...args);
    	}

    	function click_handler_5(...args) {
    		return /*click_handler_5*/ ctx[24](/*edge*/ ctx[32], ...args);
    	}

    	const block = {
    		c: function create() {
    			tr = element("tr");
    			td0 = element("td");
    			t0 = text(t0_value);
    			t1 = space();
    			td1 = element("td");
    			input = element("input");
    			t2 = space();
    			td2 = element("td");
    			t3 = text("(");
    			t4 = text(t4_value);
    			t5 = text(",");
    			t6 = text(t6_value);
    			t7 = text(")");
    			t8 = space();
    			td3 = element("td");
    			t9 = text(t9_value);
    			t10 = space();
    			attr_dev(td0, "class", "svelte-4kaswy");
    			add_location(td0, file, 405, 8, 10009);
    			input.value = input_value_value = /*edge*/ ctx[32].weight;
    			attr_dev(input, "class", "svelte-4kaswy");
    			add_location(input, file, 407, 10, 10052);
    			attr_dev(td1, "class", "svelte-4kaswy");
    			add_location(td1, file, 406, 8, 10038);
    			attr_dev(td2, "class", "svelte-4kaswy");
    			add_location(td2, file, 413, 8, 10189);
    			attr_dev(td3, "class", "svelte-4kaswy");
    			add_location(td3, file, 417, 8, 10288);
    			attr_dev(tr, "class", "svelte-4kaswy");
    			toggle_class(tr, "selected", /*edge*/ ctx[32] === /*selected*/ ctx[1]);
    			add_location(tr, file, 399, 7, 9881);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, tr, anchor);
    			append_dev(tr, td0);
    			append_dev(td0, t0);
    			append_dev(tr, t1);
    			append_dev(tr, td1);
    			append_dev(td1, input);
    			append_dev(tr, t2);
    			append_dev(tr, td2);
    			append_dev(td2, t3);
    			append_dev(td2, t4);
    			append_dev(td2, t5);
    			append_dev(td2, t6);
    			append_dev(td2, t7);
    			append_dev(tr, t8);
    			append_dev(tr, td3);
    			append_dev(td3, t9);
    			append_dev(tr, t10);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", input_handler_1, false, false, false),
    					listen_dev(tr, "click", click_handler_5, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty[0] & /*graph*/ 64 && t0_value !== (t0_value = /*edge*/ ctx[32].name + "")) set_data_dev(t0, t0_value);

    			if (dirty[0] & /*graph*/ 64 && input_value_value !== (input_value_value = /*edge*/ ctx[32].weight) && input.value !== input_value_value) {
    				prop_dev(input, "value", input_value_value);
    			}

    			if (dirty[0] & /*graph*/ 64 && t4_value !== (t4_value = /*edge*/ ctx[32].vertices[0].value + "")) set_data_dev(t4, t4_value);
    			if (dirty[0] & /*graph*/ 64 && t6_value !== (t6_value = /*edge*/ ctx[32].vertices[1].value + "")) set_data_dev(t6, t6_value);
    			if (dirty[0] & /*graph*/ 64 && t9_value !== (t9_value = /*edge*/ ctx[32].vertices[0].value * /*edge*/ ctx[32].vertices[1].value + "")) set_data_dev(t9, t9_value);

    			if (dirty[0] & /*graph, selected*/ 66) {
    				toggle_class(tr, "selected", /*edge*/ ctx[32] === /*selected*/ ctx[1]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(tr);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(399:6) {#each graph.edges as edge}",
    		ctx
    	});

    	return block;
    }

    // (357:6) {#each graph.vertices as vertex}
    function create_each_block(ctx) {
    	let tr;
    	let td0;
    	let t0;
    	let t1_value = /*vertex*/ ctx[29].index + "";
    	let t1;
    	let t2;
    	let td1;
    	let input;
    	let input_value_value;
    	let t3;
    	let td2;
    	let t4_value = /*vertex*/ ctx[29].value + "";
    	let t4;
    	let t5;
    	let td3;
    	let button;
    	let t6_value = (/*vertex*/ ctx[29].value === 0 ? 1 : 0) + "";
    	let t6;
    	let t7;
    	let t8;
    	let mounted;
    	let dispose;

    	function input_handler(...args) {
    		return /*input_handler*/ ctx[20](/*vertex*/ ctx[29], ...args);
    	}

    	function click_handler_3(...args) {
    		return /*click_handler_3*/ ctx[21](/*vertex*/ ctx[29], /*each_value*/ ctx[30], /*vertex_index*/ ctx[31], ...args);
    	}

    	function click_handler_4(...args) {
    		return /*click_handler_4*/ ctx[22](/*vertex*/ ctx[29], ...args);
    	}

    	const block = {
    		c: function create() {
    			tr = element("tr");
    			td0 = element("td");
    			t0 = text("q");
    			t1 = text(t1_value);
    			t2 = space();
    			td1 = element("td");
    			input = element("input");
    			t3 = space();
    			td2 = element("td");
    			t4 = text(t4_value);
    			t5 = space();
    			td3 = element("td");
    			button = element("button");
    			t6 = text(t6_value);
    			t7 = text("にする");
    			t8 = space();
    			attr_dev(td0, "class", "svelte-4kaswy");
    			add_location(td0, file, 363, 8, 9114);
    			input.value = input_value_value = /*vertex*/ ctx[29].weight;
    			attr_dev(input, "class", "svelte-4kaswy");
    			add_location(input, file, 365, 10, 9161);
    			attr_dev(td1, "class", "svelte-4kaswy");
    			add_location(td1, file, 364, 8, 9147);
    			attr_dev(td2, "class", "svelte-4kaswy");
    			add_location(td2, file, 371, 8, 9302);
    			add_location(button, file, 373, 9, 9349);
    			attr_dev(td3, "class", "svelte-4kaswy");
    			add_location(td3, file, 372, 8, 9335);
    			attr_dev(tr, "class", "svelte-4kaswy");
    			toggle_class(tr, "selected", /*vertex*/ ctx[29] === /*selected*/ ctx[1]);
    			add_location(tr, file, 357, 7, 8982);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, tr, anchor);
    			append_dev(tr, td0);
    			append_dev(td0, t0);
    			append_dev(td0, t1);
    			append_dev(tr, t2);
    			append_dev(tr, td1);
    			append_dev(td1, input);
    			append_dev(tr, t3);
    			append_dev(tr, td2);
    			append_dev(td2, t4);
    			append_dev(tr, t5);
    			append_dev(tr, td3);
    			append_dev(td3, button);
    			append_dev(button, t6);
    			append_dev(button, t7);
    			append_dev(tr, t8);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", input_handler, false, false, false),
    					listen_dev(button, "click", click_handler_3, false, false, false),
    					listen_dev(tr, "click", click_handler_4, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty[0] & /*graph*/ 64 && t1_value !== (t1_value = /*vertex*/ ctx[29].index + "")) set_data_dev(t1, t1_value);

    			if (dirty[0] & /*graph*/ 64 && input_value_value !== (input_value_value = /*vertex*/ ctx[29].weight) && input.value !== input_value_value) {
    				prop_dev(input, "value", input_value_value);
    			}

    			if (dirty[0] & /*graph*/ 64 && t4_value !== (t4_value = /*vertex*/ ctx[29].value + "")) set_data_dev(t4, t4_value);
    			if (dirty[0] & /*graph*/ 64 && t6_value !== (t6_value = (/*vertex*/ ctx[29].value === 0 ? 1 : 0) + "")) set_data_dev(t6, t6_value);

    			if (dirty[0] & /*graph, selected*/ 66) {
    				toggle_class(tr, "selected", /*vertex*/ ctx[29] === /*selected*/ ctx[1]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(tr);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(357:6) {#each graph.vertices as vertex}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let h1;
    	let t1;
    	let h2;
    	let t3;
    	let p0;
    	let svg0;
    	let rect0;
    	let circle0;
    	let t4;
    	let t5;
    	let p1;
    	let t7;
    	let p2;
    	let t9;
    	let main;
    	let svg1;
    	let g;
    	let rect1;
    	let circle1;
    	let if_block0_anchor;
    	let each0_anchor;
    	let each1_anchor;
    	let t10;
    	let div2;
    	let div0;
    	let p3;
    	let t12;
    	let p4;
    	let t14;
    	let div1;
    	let t15;
    	let div3;
    	let p5;
    	let t17;
    	let p6;
    	let t18_value = /*graph*/ ctx[6].calulate() + "";
    	let t18;
    	let t19;
    	let p7;
    	let t21;
    	let p8;
    	let t22_value = 2 ** /*graph*/ ctx[6].vertices.length + "";
    	let t22;
    	let t23;
    	let button0;
    	let t25;
    	let button1;
    	let t27;
    	let button2;
    	let label;
    	let t29;
    	let input;
    	let mounted;
    	let dispose;
    	let if_block0 = /*edgeMode*/ ctx[2] && create_if_block_4(ctx);
    	let each_value_3 = /*graph*/ ctx[6].edges;
    	validate_each_argument(each_value_3);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_3.length; i += 1) {
    		each_blocks_1[i] = create_each_block_3(get_each_context_3(ctx, each_value_3, i));
    	}

    	let each_value_2 = /*graph*/ ctx[6].vertices;
    	validate_each_argument(each_value_2);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	let if_block1 = /*dragNewVertexPos*/ ctx[0] && create_if_block_2(ctx);

    	function select_block_type_1(ctx, dirty) {
    		if (/*selectedInspectorTab*/ ctx[5] === "vertex") return create_if_block;
    		if (/*selectedInspectorTab*/ ctx[5] === "edge") return create_if_block_1;
    	}

    	let current_block_type = select_block_type_1(ctx);
    	let if_block2 = current_block_type && current_block_type(ctx);

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "イジングマシンを学ぼう!";
    			t1 = space();
    			h2 = element("h2");
    			h2.textContent = "つかいかた";
    			t3 = space();
    			p0 = element("p");
    			svg0 = svg_element("svg");
    			rect0 = svg_element("rect");
    			circle0 = svg_element("circle");
    			t4 = text("\n\tこの部品をドラッグしてみよう! 頂点が追加できるよ!");
    			t5 = space();
    			p1 = element("p");
    			p1.textContent = "辺を引くときは、頂点シフトキーを押しながら、ほかの頂点にドラッグすると辺を追加できるよ!";
    			t7 = space();
    			p2 = element("p");
    			p2.textContent = "右上のインスペクターから、頂点や辺に関する重みや、頂点のビットを変更できるよ!";
    			t9 = space();
    			main = element("main");
    			svg1 = svg_element("svg");
    			g = svg_element("g");
    			rect1 = svg_element("rect");
    			circle1 = svg_element("circle");
    			if (if_block0) if_block0.c();
    			if_block0_anchor = empty();

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			each0_anchor = empty();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each1_anchor = empty();
    			if (if_block1) if_block1.c();
    			t10 = space();
    			div2 = element("div");
    			div0 = element("div");
    			p3 = element("p");
    			p3.textContent = "単独作用";
    			t12 = space();
    			p4 = element("p");
    			p4.textContent = "相互作用";
    			t14 = space();
    			div1 = element("div");
    			if (if_block2) if_block2.c();
    			t15 = space();
    			div3 = element("div");
    			p5 = element("p");
    			p5.textContent = "エネルギー合計";
    			t17 = space();
    			p6 = element("p");
    			t18 = text(t18_value);
    			t19 = space();
    			p7 = element("p");
    			p7.textContent = "全探索数";
    			t21 = space();
    			p8 = element("p");
    			t22 = text(t22_value);
    			t23 = space();
    			button0 = element("button");
    			button0.textContent = "最小のエネルギーを計算する";
    			t25 = space();
    			button1 = element("button");
    			button1.textContent = "グラフのJSONをダウンロード";
    			t27 = space();
    			button2 = element("button");
    			label = element("label");
    			label.textContent = "グラフのJSONをアップロード";
    			t29 = space();
    			input = element("input");
    			add_location(h1, file, 211, 0, 5959);
    			add_location(h2, file, 212, 0, 5981);
    			attr_dev(rect0, "width", "40");
    			attr_dev(rect0, "height", "40");
    			attr_dev(rect0, "fill", "#ffffff");
    			attr_dev(rect0, "stroke", "black");
    			add_location(rect0, file, 215, 2, 6032);
    			attr_dev(circle0, "cx", "20");
    			attr_dev(circle0, "cy", "20");
    			attr_dev(circle0, "r", "15");
    			attr_dev(circle0, "fill", "#ffffff");
    			attr_dev(circle0, "stroke", "black");
    			add_location(circle0, file, 216, 2, 6096);
    			attr_dev(svg0, "width", "40");
    			attr_dev(svg0, "height", "40");
    			attr_dev(svg0, "class", "svelte-4kaswy");
    			add_location(svg0, file, 214, 1, 6001);
    			add_location(p0, file, 213, 0, 5996);
    			add_location(p1, file, 220, 0, 6201);
    			add_location(p2, file, 223, 0, 6256);
    			attr_dev(rect1, "width", "80");
    			attr_dev(rect1, "height", "80");
    			attr_dev(rect1, "fill", "#ffffff");
    			attr_dev(rect1, "stroke", "black");
    			add_location(rect1, file, 235, 3, 6503);
    			attr_dev(circle1, "cx", "40");
    			attr_dev(circle1, "cy", "40");
    			attr_dev(circle1, "r", "30");
    			attr_dev(circle1, "fill", "#ffffff");
    			attr_dev(circle1, "stroke", "black");
    			add_location(circle1, file, 236, 3, 6568);
    			attr_dev(g, "transform", "translate(0,10)");
    			add_location(g, file, 234, 2, 6437);
    			attr_dev(svg1, "width", "100%");
    			attr_dev(svg1, "height", "100%");
    			attr_dev(svg1, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg1, "class", "svelte-4kaswy");
    			add_location(svg1, file, 227, 1, 6314);
    			attr_dev(p3, "class", "svelte-4kaswy");
    			toggle_class(p3, "not-selected", /*selectedInspectorTab*/ ctx[5] !== "vertex");
    			add_location(p3, file, 328, 3, 8408);
    			attr_dev(p4, "class", "svelte-4kaswy");
    			toggle_class(p4, "not-selected", /*selectedInspectorTab*/ ctx[5] !== "edge");
    			add_location(p4, file, 336, 3, 8563);
    			attr_dev(div0, "class", "inspector-tab svelte-4kaswy");
    			add_location(div0, file, 327, 2, 8377);
    			attr_dev(div1, "class", "inspector-main svelte-4kaswy");
    			add_location(div1, file, 345, 2, 8722);
    			attr_dev(div2, "class", "inspector svelte-4kaswy");
    			add_location(div2, file, 326, 1, 8351);
    			add_location(p5, file, 430, 2, 10481);
    			add_location(p6, file, 431, 2, 10498);
    			add_location(p7, file, 432, 2, 10526);
    			add_location(p8, file, 433, 2, 10540);
    			add_location(button0, file, 434, 2, 10578);
    			add_location(button1, file, 441, 2, 10688);
    			attr_dev(label, "id", "file-upload-label");
    			attr_dev(label, "for", "json-upload");
    			add_location(label, file, 443, 4, 10756);
    			add_location(button2, file, 442, 2, 10744);
    			attr_dev(input, "type", "file");
    			set_style(input, "visibility", "hidden");
    			attr_dev(input, "id", "json-upload");
    			add_location(input, file, 447, 2, 10851);
    			attr_dev(div3, "class", "result svelte-4kaswy");
    			add_location(div3, file, 429, 1, 10458);
    			attr_dev(main, "class", "svelte-4kaswy");
    			add_location(main, file, 226, 0, 6306);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, h2, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, p0, anchor);
    			append_dev(p0, svg0);
    			append_dev(svg0, rect0);
    			append_dev(svg0, circle0);
    			append_dev(p0, t4);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, p1, anchor);
    			insert_dev(target, t7, anchor);
    			insert_dev(target, p2, anchor);
    			insert_dev(target, t9, anchor);
    			insert_dev(target, main, anchor);
    			append_dev(main, svg1);
    			append_dev(svg1, g);
    			append_dev(g, rect1);
    			append_dev(g, circle1);
    			if (if_block0) if_block0.m(svg1, null);
    			append_dev(svg1, if_block0_anchor);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(svg1, null);
    			}

    			append_dev(svg1, each0_anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(svg1, null);
    			}

    			append_dev(svg1, each1_anchor);
    			if (if_block1) if_block1.m(svg1, null);
    			append_dev(main, t10);
    			append_dev(main, div2);
    			append_dev(div2, div0);
    			append_dev(div0, p3);
    			append_dev(div0, t12);
    			append_dev(div0, p4);
    			append_dev(div2, t14);
    			append_dev(div2, div1);
    			if (if_block2) if_block2.m(div1, null);
    			append_dev(main, t15);
    			append_dev(main, div3);
    			append_dev(div3, p5);
    			append_dev(div3, t17);
    			append_dev(div3, p6);
    			append_dev(p6, t18);
    			append_dev(div3, t19);
    			append_dev(div3, p7);
    			append_dev(div3, t21);
    			append_dev(div3, p8);
    			append_dev(p8, t22);
    			append_dev(div3, t23);
    			append_dev(div3, button0);
    			append_dev(div3, t25);
    			append_dev(div3, button1);
    			append_dev(div3, t27);
    			append_dev(div3, button2);
    			append_dev(button2, label);
    			append_dev(div3, t29);
    			append_dev(div3, input);

    			if (!mounted) {
    				dispose = [
    					listen_dev(g, "mousedown", /*addNewVertexPos*/ ctx[11], false, false, false),
    					listen_dev(svg1, "mousemove", /*drag*/ ctx[8], false, false, false),
    					listen_dev(svg1, "mouseup", /*dragEnd*/ ctx[9], false, false, false),
    					listen_dev(p3, "click", /*click_handler_1*/ ctx[18], false, false, false),
    					listen_dev(p4, "click", /*click_handler_2*/ ctx[19], false, false, false),
    					listen_dev(button0, "click", /*click_handler_6*/ ctx[25], false, false, false),
    					listen_dev(button1, "click", /*download*/ ctx[13], false, false, false),
    					listen_dev(input, "change", /*upload*/ ctx[14], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (/*edgeMode*/ ctx[2]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_4(ctx);
    					if_block0.c();
    					if_block0.m(svg1, if_block0_anchor);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (dirty[0] & /*graph, selected*/ 66) {
    				each_value_3 = /*graph*/ ctx[6].edges;
    				validate_each_argument(each_value_3);
    				let i;

    				for (i = 0; i < each_value_3.length; i += 1) {
    					const child_ctx = get_each_context_3(ctx, each_value_3, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_3(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(svg1, each0_anchor);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_3.length;
    			}

    			if (dirty[0] & /*graph, dragStart, addEdge, selected*/ 4290) {
    				each_value_2 = /*graph*/ ctx[6].vertices;
    				validate_each_argument(each_value_2);
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(svg1, each1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_2.length;
    			}

    			if (/*dragNewVertexPos*/ ctx[0]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_2(ctx);
    					if_block1.c();
    					if_block1.m(svg1, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (dirty[0] & /*selectedInspectorTab*/ 32) {
    				toggle_class(p3, "not-selected", /*selectedInspectorTab*/ ctx[5] !== "vertex");
    			}

    			if (dirty[0] & /*selectedInspectorTab*/ 32) {
    				toggle_class(p4, "not-selected", /*selectedInspectorTab*/ ctx[5] !== "edge");
    			}

    			if (current_block_type === (current_block_type = select_block_type_1(ctx)) && if_block2) {
    				if_block2.p(ctx, dirty);
    			} else {
    				if (if_block2) if_block2.d(1);
    				if_block2 = current_block_type && current_block_type(ctx);

    				if (if_block2) {
    					if_block2.c();
    					if_block2.m(div1, null);
    				}
    			}

    			if (dirty[0] & /*graph*/ 64 && t18_value !== (t18_value = /*graph*/ ctx[6].calulate() + "")) set_data_dev(t18, t18_value);
    			if (dirty[0] & /*graph*/ 64 && t22_value !== (t22_value = 2 ** /*graph*/ ctx[6].vertices.length + "")) set_data_dev(t22, t22_value);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h1);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(h2);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(p0);
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(p1);
    			if (detaching) detach_dev(t7);
    			if (detaching) detach_dev(p2);
    			if (detaching) detach_dev(t9);
    			if (detaching) detach_dev(main);
    			if (if_block0) if_block0.d();
    			destroy_each(each_blocks_1, detaching);
    			destroy_each(each_blocks, detaching);
    			if (if_block1) if_block1.d();

    			if (if_block2) {
    				if_block2.d();
    			}

    			mounted = false;
    			run_all(dispose);
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

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let dragVertex;
    	let dragNewVertexPos;
    	let selected;
    	let edgeMode = false;
    	let edgeStartVertex;
    	let edgeEndVertexPos;
    	let selectedInspectorTab = "vertex";

    	class Edge {
    		constructor(vertices, weight = 0) {
    			this.vertices = vertices;
    			this.weight = weight;
    		}

    		get x1() {
    			return this.vertices[0].position[0];
    		}

    		get y1() {
    			return this.vertices[0].position[1];
    		}

    		get x2() {
    			return this.vertices[1].position[0];
    		}

    		get y2() {
    			return this.vertices[1].position[1];
    		}

    		get centerX() {
    			return (this.x1 + this.x2) / 2;
    		}

    		get centerY() {
    			return (this.y1 + this.y2) / 2;
    		}

    		get name() {
    			return `q${this.vertices[0].index},q${this.vertices[1].index}`;
    		}
    	}

    	class Graph {
    		constructor() {
    			this.vertices = [];
    			this.edges = [];
    		}

    		addVertex(position, weight = 0, value = 0, index = undefined) {
    			const vertex = {
    				index: index !== null && index !== void 0
    				? index
    				: this.vertices.length,
    				position,
    				weight,
    				value
    			};

    			if (index) {
    				this.vertices[index] = vertex;
    			} else {
    				this.vertices.push(vertex);
    			}

    			return vertex;
    		}

    		addEdge(vertices, weight = 0) {
    			const [v1, v2] = vertices;

    			if (v1 === v2) {
    				return;
    			}

    			const newVertices = v1.index < v2.index ? vertices : [v2, v1];

    			if (this.edges.find(edge => edge.vertices[0] === v1 && edge.vertices[1] === v2)) {
    				return;
    			}

    			const edge = new Edge(newVertices, weight);
    			this.edges.push(edge);
    			return edge;
    		}

    		calulate() {
    			let result = 0;
    			result += graph.vertices.map(vertex => vertex.value * vertex.weight).reduce((a, b) => a + b, 0);
    			result += graph.edges.map(edge => edge.weight * edge.vertices[0].value * edge.vertices[1].value).reduce((a, b) => a + b, 0);
    			return result;
    		}

    		calculateMin() {
    			let count = Math.pow(2, this.vertices.length);
    			let min;
    			let verticesNumber;

    			for (let i = 0; i < count; i++) {
    				for (let n = 0; n < this.vertices.length; n++) {
    					this.vertices[n].value = i >> n & 1;
    				}

    				const result = this.calulate();

    				if (min === undefined || min > result) {
    					min = result;
    					verticesNumber = i;
    				}
    			}

    			for (let n = 0; n < this.vertices.length; n++) {
    				this.vertices[n].value = verticesNumber >> n & 1;
    			}

    			return min;
    		}
    	}

    	let graph = new Graph();

    	function dragStart(e, vertex) {
    		if (e.shiftKey) {
    			$$invalidate(2, edgeMode = true);
    			$$invalidate(3, edgeStartVertex = vertex);
    			$$invalidate(4, edgeEndVertexPos = [e.offsetX, e.offsetY]);
    			return;
    		}

    		dragVertex = vertex;
    		$$invalidate(1, selected = vertex);
    	}

    	function drag(e) {
    		if (dragVertex) {
    			dragVertex.position[0] = e.offsetX;
    			dragVertex.position[1] = e.offsetY;
    			$$invalidate(6, graph);
    		} else if (dragNewVertexPos) {
    			$$invalidate(0, dragNewVertexPos[0] = e.offsetX, dragNewVertexPos);
    			$$invalidate(0, dragNewVertexPos[1] = e.offsetY, dragNewVertexPos);
    		} else if (edgeMode) {
    			$$invalidate(4, edgeEndVertexPos[0] = e.offsetX, edgeEndVertexPos);
    			$$invalidate(4, edgeEndVertexPos[1] = e.offsetY, edgeEndVertexPos);
    		}
    	}

    	function dragEnd(e) {
    		if (dragVertex) {
    			dragVertex = undefined;
    		} else if (dragNewVertexPos) {
    			graph.addVertex(dragNewVertexPos);
    			$$invalidate(0, dragNewVertexPos = undefined);
    			$$invalidate(6, graph);
    		} else {
    			$$invalidate(2, edgeMode = false);
    			$$invalidate(3, edgeStartVertex = undefined);
    		}
    	}

    	function inputVertexChange(e, target) {
    		const value = parseInt(e.target.value, 10);

    		if (value > -100 && value < 100) {
    			target.weight = value;
    		} else if (value >= 100) {
    			target.weight = 100;
    		} else if (value <= -100) {
    			target.weight = -100;
    		}

    		$$invalidate(6, graph);
    	}

    	function addNewVertexPos(e) {
    		$$invalidate(0, dragNewVertexPos = [e.offsetX, e.offsetY]);
    	}

    	function addEdge(endVertex) {
    		if (edgeMode && edgeStartVertex) {
    			graph.addEdge([edgeStartVertex, endVertex]);
    			$$invalidate(6, graph);
    		}
    	}

    	function download(e) {
    		const a = document.createElement("a");

    		const file = new Blob([
    				JSON.stringify({
    					vertices: graph.vertices,
    					edges: graph.edges
    				})
    			],
    		{ type: "text/plain" });

    		a.href = URL.createObjectURL(file);
    		a.download = "graph.json";
    		a.click();
    		a.remove();
    	}

    	function upload(event) {
    		const file = event.target.files[0];

    		if (file) {
    			const reader = new FileReader();
    			reader.readAsText(file);

    			reader.onload = function () {
    				var _a, _b;
    				const result = reader.result;

    				if (typeof result === "string") {
    					const data = JSON.parse(result);
    					$$invalidate(6, graph.vertices = [], graph);
    					$$invalidate(6, graph.edges = [], graph);
    					const vertices = data.vertices;
    					const edges = data.edges;

    					for (let v of vertices) {
    						const position = (_a = v.position) !== null && _a !== void 0
    						? _a
    						: [Math.random() * 800, Math.random() * 800];

    						const value = (_b = v.value) !== null && _b !== void 0 ? _b : 0;
    						const weight = v.weight;
    						graph.addVertex(position, weight, value);
    					}

    					for (let e of edges) {
    						const [v1, v2] = e.vertices;
    						const weight = e.weight;
    						graph.addEdge([vertices[v1.index], vertices[v2.index]], weight);
    					}

    					$$invalidate(6, graph);
    					console.log(graph);
    					console.log(data);
    				}
    			};
    		}
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	const click_handler = (edge, e) => {
    		$$invalidate(1, selected = edge);
    	};

    	const mousedown_handler = (vertex, e) => dragStart(e, vertex);

    	const mouseup_handler = (vertex, e) => {
    		addEdge(vertex);
    	};

    	const click_handler_1 = e => {
    		$$invalidate(5, selectedInspectorTab = "vertex");
    	};

    	const click_handler_2 = e => {
    		$$invalidate(5, selectedInspectorTab = "edge");
    	};

    	const input_handler = (vertex, e) => inputVertexChange(e, vertex);

    	const click_handler_3 = (vertex, each_value, vertex_index, e) => {
    		$$invalidate(6, each_value[vertex_index].value = vertex.value === 0 ? 1 : 0, graph);
    		$$invalidate(6, graph);
    	};

    	const click_handler_4 = (vertex, e) => {
    		$$invalidate(1, selected = vertex);
    	};

    	const input_handler_1 = (edge, e) => inputVertexChange(e, edge);

    	const click_handler_5 = (edge, e) => {
    		$$invalidate(1, selected = edge);
    	};

    	const click_handler_6 = e => {
    		graph.calculateMin();
    		$$invalidate(6, graph);
    	};

    	$$self.$capture_state = () => ({
    		dragVertex,
    		dragNewVertexPos,
    		selected,
    		edgeMode,
    		edgeStartVertex,
    		edgeEndVertexPos,
    		selectedInspectorTab,
    		Edge,
    		Graph,
    		graph,
    		dragStart,
    		drag,
    		dragEnd,
    		inputVertexChange,
    		addNewVertexPos,
    		addEdge,
    		download,
    		upload
    	});

    	$$self.$inject_state = $$props => {
    		if ('dragVertex' in $$props) dragVertex = $$props.dragVertex;
    		if ('dragNewVertexPos' in $$props) $$invalidate(0, dragNewVertexPos = $$props.dragNewVertexPos);
    		if ('selected' in $$props) $$invalidate(1, selected = $$props.selected);
    		if ('edgeMode' in $$props) $$invalidate(2, edgeMode = $$props.edgeMode);
    		if ('edgeStartVertex' in $$props) $$invalidate(3, edgeStartVertex = $$props.edgeStartVertex);
    		if ('edgeEndVertexPos' in $$props) $$invalidate(4, edgeEndVertexPos = $$props.edgeEndVertexPos);
    		if ('selectedInspectorTab' in $$props) $$invalidate(5, selectedInspectorTab = $$props.selectedInspectorTab);
    		if ('graph' in $$props) $$invalidate(6, graph = $$props.graph);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		dragNewVertexPos,
    		selected,
    		edgeMode,
    		edgeStartVertex,
    		edgeEndVertexPos,
    		selectedInspectorTab,
    		graph,
    		dragStart,
    		drag,
    		dragEnd,
    		inputVertexChange,
    		addNewVertexPos,
    		addEdge,
    		download,
    		upload,
    		click_handler,
    		mousedown_handler,
    		mouseup_handler,
    		click_handler_1,
    		click_handler_2,
    		input_handler,
    		click_handler_3,
    		click_handler_4,
    		input_handler_1,
    		click_handler_5,
    		click_handler_6
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {}, null, [-1, -1]);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
        target: document.body,
        props: {
            name: 'world'
        }
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
