
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
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
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function action_destroyer(action_result) {
        return action_result && is_function(action_result.destroy) ? action_result.destroy : noop;
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
    function to_number(value) {
        return value === '' ? null : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
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
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function afterUpdate(fn) {
        get_current_component().$$.after_update.push(fn);
    }
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            // @ts-ignore
            callbacks.slice().forEach(fn => fn.call(this, event));
        }
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
    function tick() {
        schedule_update();
        return resolved_promise;
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
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }
    function get_spread_object(spread_props) {
        return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
    }
    function create_component(block) {
        block && block.c();
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
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.42.6' }, detail), true));
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

    /**
     * @typedef {Object} WrappedComponent Object returned by the `wrap` method
     * @property {SvelteComponent} component - Component to load (this is always asynchronous)
     * @property {RoutePrecondition[]} [conditions] - Route pre-conditions to validate
     * @property {Object} [props] - Optional dictionary of static props
     * @property {Object} [userData] - Optional user data dictionary
     * @property {bool} _sveltesparouter - Internal flag; always set to true
     */

    /**
     * @callback AsyncSvelteComponent
     * @returns {Promise<SvelteComponent>} Returns a Promise that resolves with a Svelte component
     */

    /**
     * @callback RoutePrecondition
     * @param {RouteDetail} detail - Route detail object
     * @returns {boolean|Promise<boolean>} If the callback returns a false-y value, it's interpreted as the precondition failed, so it aborts loading the component (and won't process other pre-condition callbacks)
     */

    /**
     * @typedef {Object} WrapOptions Options object for the call to `wrap`
     * @property {SvelteComponent} [component] - Svelte component to load (this is incompatible with `asyncComponent`)
     * @property {AsyncSvelteComponent} [asyncComponent] - Function that returns a Promise that fulfills with a Svelte component (e.g. `{asyncComponent: () => import('Foo.svelte')}`)
     * @property {SvelteComponent} [loadingComponent] - Svelte component to be displayed while the async route is loading (as a placeholder); when unset or false-y, no component is shown while component
     * @property {object} [loadingParams] - Optional dictionary passed to the `loadingComponent` component as params (for an exported prop called `params`)
     * @property {object} [userData] - Optional object that will be passed to events such as `routeLoading`, `routeLoaded`, `conditionsFailed`
     * @property {object} [props] - Optional key-value dictionary of static props that will be passed to the component. The props are expanded with {...props}, so the key in the dictionary becomes the name of the prop.
     * @property {RoutePrecondition[]|RoutePrecondition} [conditions] - Route pre-conditions to add, which will be executed in order
     */

    /**
     * Wraps a component to enable multiple capabilities:
     * 1. Using dynamically-imported component, with (e.g. `{asyncComponent: () => import('Foo.svelte')}`), which also allows bundlers to do code-splitting.
     * 2. Adding route pre-conditions (e.g. `{conditions: [...]}`)
     * 3. Adding static props that are passed to the component
     * 4. Adding custom userData, which is passed to route events (e.g. route loaded events) or to route pre-conditions (e.g. `{userData: {foo: 'bar}}`)
     * 
     * @param {WrapOptions} args - Arguments object
     * @returns {WrappedComponent} Wrapped component
     */
    function wrap$1(args) {
        if (!args) {
            throw Error('Parameter args is required')
        }

        // We need to have one and only one of component and asyncComponent
        // This does a "XNOR"
        if (!args.component == !args.asyncComponent) {
            throw Error('One and only one of component and asyncComponent is required')
        }

        // If the component is not async, wrap it into a function returning a Promise
        if (args.component) {
            args.asyncComponent = () => Promise.resolve(args.component);
        }

        // Parameter asyncComponent and each item of conditions must be functions
        if (typeof args.asyncComponent != 'function') {
            throw Error('Parameter asyncComponent must be a function')
        }
        if (args.conditions) {
            // Ensure it's an array
            if (!Array.isArray(args.conditions)) {
                args.conditions = [args.conditions];
            }
            for (let i = 0; i < args.conditions.length; i++) {
                if (!args.conditions[i] || typeof args.conditions[i] != 'function') {
                    throw Error('Invalid parameter conditions[' + i + ']')
                }
            }
        }

        // Check if we have a placeholder component
        if (args.loadingComponent) {
            args.asyncComponent.loading = args.loadingComponent;
            args.asyncComponent.loadingParams = args.loadingParams || undefined;
        }

        // Returns an object that contains all the functions to execute too
        // The _sveltesparouter flag is to confirm the object was created by this router
        const obj = {
            component: args.asyncComponent,
            userData: args.userData,
            conditions: (args.conditions && args.conditions.length) ? args.conditions : undefined,
            props: (args.props && Object.keys(args.props).length) ? args.props : {},
            _sveltesparouter: true
        };

        return obj
    }

    const subscriber_queue = [];
    /**
     * Creates a `Readable` store that allows reading by subscription.
     * @param value initial value
     * @param {StartStopNotifier}start start and stop notifications for subscriptions
     */
    function readable(value, start) {
        return {
            subscribe: writable(value, start).subscribe
        };
    }
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = new Set();
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (const subscriber of subscribers) {
                        subscriber[1]();
                        subscriber_queue.push(subscriber, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.add(subscriber);
            if (subscribers.size === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                subscribers.delete(subscriber);
                if (subscribers.size === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }
    function derived(stores, fn, initial_value) {
        const single = !Array.isArray(stores);
        const stores_array = single
            ? [stores]
            : stores;
        const auto = fn.length < 2;
        return readable(initial_value, (set) => {
            let inited = false;
            const values = [];
            let pending = 0;
            let cleanup = noop;
            const sync = () => {
                if (pending) {
                    return;
                }
                cleanup();
                const result = fn(single ? values[0] : values, set);
                if (auto) {
                    set(result);
                }
                else {
                    cleanup = is_function(result) ? result : noop;
                }
            };
            const unsubscribers = stores_array.map((store, i) => subscribe(store, (value) => {
                values[i] = value;
                pending &= ~(1 << i);
                if (inited) {
                    sync();
                }
            }, () => {
                pending |= (1 << i);
            }));
            inited = true;
            sync();
            return function stop() {
                run_all(unsubscribers);
                cleanup();
            };
        });
    }

    function parse(str, loose) {
    	if (str instanceof RegExp) return { keys:false, pattern:str };
    	var c, o, tmp, ext, keys=[], pattern='', arr = str.split('/');
    	arr[0] || arr.shift();

    	while (tmp = arr.shift()) {
    		c = tmp[0];
    		if (c === '*') {
    			keys.push('wild');
    			pattern += '/(.*)';
    		} else if (c === ':') {
    			o = tmp.indexOf('?', 1);
    			ext = tmp.indexOf('.', 1);
    			keys.push( tmp.substring(1, !!~o ? o : !!~ext ? ext : tmp.length) );
    			pattern += !!~o && !~ext ? '(?:/([^/]+?))?' : '/([^/]+?)';
    			if (!!~ext) pattern += (!!~o ? '?' : '') + '\\' + tmp.substring(ext);
    		} else {
    			pattern += '/' + tmp;
    		}
    	}

    	return {
    		keys: keys,
    		pattern: new RegExp('^' + pattern + (loose ? '(?=$|\/)' : '\/?$'), 'i')
    	};
    }

    /* node_modules\svelte-spa-router\Router.svelte generated by Svelte v3.42.6 */

    const { Error: Error_1, Object: Object_1, console: console_1$1 } = globals;

    // (251:0) {:else}
    function create_else_block$1(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	const switch_instance_spread_levels = [/*props*/ ctx[2]];
    	var switch_value = /*component*/ ctx[0];

    	function switch_props(ctx) {
    		let switch_instance_props = {};

    		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
    			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
    		}

    		return {
    			props: switch_instance_props,
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props());
    		switch_instance.$on("routeEvent", /*routeEvent_handler_1*/ ctx[7]);
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const switch_instance_changes = (dirty & /*props*/ 4)
    			? get_spread_update(switch_instance_spread_levels, [get_spread_object(/*props*/ ctx[2])])
    			: {};

    			if (switch_value !== (switch_value = /*component*/ ctx[0])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());
    					switch_instance.$on("routeEvent", /*routeEvent_handler_1*/ ctx[7]);
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$1.name,
    		type: "else",
    		source: "(251:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (244:0) {#if componentParams}
    function create_if_block$1(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	const switch_instance_spread_levels = [{ params: /*componentParams*/ ctx[1] }, /*props*/ ctx[2]];
    	var switch_value = /*component*/ ctx[0];

    	function switch_props(ctx) {
    		let switch_instance_props = {};

    		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
    			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
    		}

    		return {
    			props: switch_instance_props,
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props());
    		switch_instance.$on("routeEvent", /*routeEvent_handler*/ ctx[6]);
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const switch_instance_changes = (dirty & /*componentParams, props*/ 6)
    			? get_spread_update(switch_instance_spread_levels, [
    					dirty & /*componentParams*/ 2 && { params: /*componentParams*/ ctx[1] },
    					dirty & /*props*/ 4 && get_spread_object(/*props*/ ctx[2])
    				])
    			: {};

    			if (switch_value !== (switch_value = /*component*/ ctx[0])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());
    					switch_instance.$on("routeEvent", /*routeEvent_handler*/ ctx[6]);
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(244:0) {#if componentParams}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block$1, create_else_block$1];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*componentParams*/ ctx[1]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error_1("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function wrap(component, userData, ...conditions) {
    	// Use the new wrap method and show a deprecation warning
    	// eslint-disable-next-line no-console
    	console.warn('Method `wrap` from `svelte-spa-router` is deprecated and will be removed in a future version. Please use `svelte-spa-router/wrap` instead. See http://bit.ly/svelte-spa-router-upgrading');

    	return wrap$1({ component, userData, conditions });
    }

    /**
     * @typedef {Object} Location
     * @property {string} location - Location (page/view), for example `/book`
     * @property {string} [querystring] - Querystring from the hash, as a string not parsed
     */
    /**
     * Returns the current location from the hash.
     *
     * @returns {Location} Location object
     * @private
     */
    function getLocation() {
    	const hashPosition = window.location.href.indexOf('#/');

    	let location = hashPosition > -1
    	? window.location.href.substr(hashPosition + 1)
    	: '/';

    	// Check if there's a querystring
    	const qsPosition = location.indexOf('?');

    	let querystring = '';

    	if (qsPosition > -1) {
    		querystring = location.substr(qsPosition + 1);
    		location = location.substr(0, qsPosition);
    	}

    	return { location, querystring };
    }

    const loc = readable(null, // eslint-disable-next-line prefer-arrow-callback
    function start(set) {
    	set(getLocation());

    	const update = () => {
    		set(getLocation());
    	};

    	window.addEventListener('hashchange', update, false);

    	return function stop() {
    		window.removeEventListener('hashchange', update, false);
    	};
    });

    const location = derived(loc, $loc => $loc.location);
    const querystring = derived(loc, $loc => $loc.querystring);
    const params = writable(undefined);

    async function push(location) {
    	if (!location || location.length < 1 || location.charAt(0) != '/' && location.indexOf('#/') !== 0) {
    		throw Error('Invalid parameter location');
    	}

    	// Execute this code when the current call stack is complete
    	await tick();

    	// Note: this will include scroll state in history even when restoreScrollState is false
    	history.replaceState(
    		{
    			...history.state,
    			__svelte_spa_router_scrollX: window.scrollX,
    			__svelte_spa_router_scrollY: window.scrollY
    		},
    		undefined,
    		undefined
    	);

    	window.location.hash = (location.charAt(0) == '#' ? '' : '#') + location;
    }

    async function pop() {
    	// Execute this code when the current call stack is complete
    	await tick();

    	window.history.back();
    }

    async function replace(location) {
    	if (!location || location.length < 1 || location.charAt(0) != '/' && location.indexOf('#/') !== 0) {
    		throw Error('Invalid parameter location');
    	}

    	// Execute this code when the current call stack is complete
    	await tick();

    	const dest = (location.charAt(0) == '#' ? '' : '#') + location;

    	try {
    		const newState = { ...history.state };
    		delete newState['__svelte_spa_router_scrollX'];
    		delete newState['__svelte_spa_router_scrollY'];
    		window.history.replaceState(newState, undefined, dest);
    	} catch(e) {
    		// eslint-disable-next-line no-console
    		console.warn('Caught exception while replacing the current page. If you\'re running this in the Svelte REPL, please note that the `replace` method might not work in this environment.');
    	}

    	// The method above doesn't trigger the hashchange event, so let's do that manually
    	window.dispatchEvent(new Event('hashchange'));
    }

    function link(node, opts) {
    	opts = linkOpts(opts);

    	// Only apply to <a> tags
    	if (!node || !node.tagName || node.tagName.toLowerCase() != 'a') {
    		throw Error('Action "link" can only be used with <a> tags');
    	}

    	updateLink(node, opts);

    	return {
    		update(updated) {
    			updated = linkOpts(updated);
    			updateLink(node, updated);
    		}
    	};
    }

    // Internal function used by the link function
    function updateLink(node, opts) {
    	let href = opts.href || node.getAttribute('href');

    	// Destination must start with '/' or '#/'
    	if (href && href.charAt(0) == '/') {
    		// Add # to the href attribute
    		href = '#' + href;
    	} else if (!href || href.length < 2 || href.slice(0, 2) != '#/') {
    		throw Error('Invalid value for "href" attribute: ' + href);
    	}

    	node.setAttribute('href', href);

    	node.addEventListener('click', event => {
    		// Prevent default anchor onclick behaviour
    		event.preventDefault();

    		if (!opts.disabled) {
    			scrollstateHistoryHandler(event.currentTarget.getAttribute('href'));
    		}
    	});
    }

    // Internal function that ensures the argument of the link action is always an object
    function linkOpts(val) {
    	if (val && typeof val == 'string') {
    		return { href: val };
    	} else {
    		return val || {};
    	}
    }

    /**
     * The handler attached to an anchor tag responsible for updating the
     * current history state with the current scroll state
     *
     * @param {string} href - Destination
     */
    function scrollstateHistoryHandler(href) {
    	// Setting the url (3rd arg) to href will break clicking for reasons, so don't try to do that
    	history.replaceState(
    		{
    			...history.state,
    			__svelte_spa_router_scrollX: window.scrollX,
    			__svelte_spa_router_scrollY: window.scrollY
    		},
    		undefined,
    		undefined
    	);

    	// This will force an update as desired, but this time our scroll state will be attached
    	window.location.hash = href;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Router', slots, []);
    	let { routes = {} } = $$props;
    	let { prefix = '' } = $$props;
    	let { restoreScrollState = false } = $$props;

    	/**
     * Container for a route: path, component
     */
    	class RouteItem {
    		/**
     * Initializes the object and creates a regular expression from the path, using regexparam.
     *
     * @param {string} path - Path to the route (must start with '/' or '*')
     * @param {SvelteComponent|WrappedComponent} component - Svelte component for the route, optionally wrapped
     */
    		constructor(path, component) {
    			if (!component || typeof component != 'function' && (typeof component != 'object' || component._sveltesparouter !== true)) {
    				throw Error('Invalid component object');
    			}

    			// Path must be a regular or expression, or a string starting with '/' or '*'
    			if (!path || typeof path == 'string' && (path.length < 1 || path.charAt(0) != '/' && path.charAt(0) != '*') || typeof path == 'object' && !(path instanceof RegExp)) {
    				throw Error('Invalid value for "path" argument - strings must start with / or *');
    			}

    			const { pattern, keys } = parse(path);
    			this.path = path;

    			// Check if the component is wrapped and we have conditions
    			if (typeof component == 'object' && component._sveltesparouter === true) {
    				this.component = component.component;
    				this.conditions = component.conditions || [];
    				this.userData = component.userData;
    				this.props = component.props || {};
    			} else {
    				// Convert the component to a function that returns a Promise, to normalize it
    				this.component = () => Promise.resolve(component);

    				this.conditions = [];
    				this.props = {};
    			}

    			this._pattern = pattern;
    			this._keys = keys;
    		}

    		/**
     * Checks if `path` matches the current route.
     * If there's a match, will return the list of parameters from the URL (if any).
     * In case of no match, the method will return `null`.
     *
     * @param {string} path - Path to test
     * @returns {null|Object.<string, string>} List of paramters from the URL if there's a match, or `null` otherwise.
     */
    		match(path) {
    			// If there's a prefix, check if it matches the start of the path.
    			// If not, bail early, else remove it before we run the matching.
    			if (prefix) {
    				if (typeof prefix == 'string') {
    					if (path.startsWith(prefix)) {
    						path = path.substr(prefix.length) || '/';
    					} else {
    						return null;
    					}
    				} else if (prefix instanceof RegExp) {
    					const match = path.match(prefix);

    					if (match && match[0]) {
    						path = path.substr(match[0].length) || '/';
    					} else {
    						return null;
    					}
    				}
    			}

    			// Check if the pattern matches
    			const matches = this._pattern.exec(path);

    			if (matches === null) {
    				return null;
    			}

    			// If the input was a regular expression, this._keys would be false, so return matches as is
    			if (this._keys === false) {
    				return matches;
    			}

    			const out = {};
    			let i = 0;

    			while (i < this._keys.length) {
    				// In the match parameters, URL-decode all values
    				try {
    					out[this._keys[i]] = decodeURIComponent(matches[i + 1] || '') || null;
    				} catch(e) {
    					out[this._keys[i]] = null;
    				}

    				i++;
    			}

    			return out;
    		}

    		/**
     * Dictionary with route details passed to the pre-conditions functions, as well as the `routeLoading`, `routeLoaded` and `conditionsFailed` events
     * @typedef {Object} RouteDetail
     * @property {string|RegExp} route - Route matched as defined in the route definition (could be a string or a reguar expression object)
     * @property {string} location - Location path
     * @property {string} querystring - Querystring from the hash
     * @property {object} [userData] - Custom data passed by the user
     * @property {SvelteComponent} [component] - Svelte component (only in `routeLoaded` events)
     * @property {string} [name] - Name of the Svelte component (only in `routeLoaded` events)
     */
    		/**
     * Executes all conditions (if any) to control whether the route can be shown. Conditions are executed in the order they are defined, and if a condition fails, the following ones aren't executed.
     * 
     * @param {RouteDetail} detail - Route detail
     * @returns {boolean} Returns true if all the conditions succeeded
     */
    		async checkConditions(detail) {
    			for (let i = 0; i < this.conditions.length; i++) {
    				if (!await this.conditions[i](detail)) {
    					return false;
    				}
    			}

    			return true;
    		}
    	}

    	// Set up all routes
    	const routesList = [];

    	if (routes instanceof Map) {
    		// If it's a map, iterate on it right away
    		routes.forEach((route, path) => {
    			routesList.push(new RouteItem(path, route));
    		});
    	} else {
    		// We have an object, so iterate on its own properties
    		Object.keys(routes).forEach(path => {
    			routesList.push(new RouteItem(path, routes[path]));
    		});
    	}

    	// Props for the component to render
    	let component = null;

    	let componentParams = null;
    	let props = {};

    	// Event dispatcher from Svelte
    	const dispatch = createEventDispatcher();

    	// Just like dispatch, but executes on the next iteration of the event loop
    	async function dispatchNextTick(name, detail) {
    		// Execute this code when the current call stack is complete
    		await tick();

    		dispatch(name, detail);
    	}

    	// If this is set, then that means we have popped into this var the state of our last scroll position
    	let previousScrollState = null;

    	let popStateChanged = null;

    	if (restoreScrollState) {
    		popStateChanged = event => {
    			// If this event was from our history.replaceState, event.state will contain
    			// our scroll history. Otherwise, event.state will be null (like on forward
    			// navigation)
    			if (event.state && event.state.__svelte_spa_router_scrollY) {
    				previousScrollState = event.state;
    			} else {
    				previousScrollState = null;
    			}
    		};

    		// This is removed in the destroy() invocation below
    		window.addEventListener('popstate', popStateChanged);

    		afterUpdate(() => {
    			// If this exists, then this is a back navigation: restore the scroll position
    			if (previousScrollState) {
    				window.scrollTo(previousScrollState.__svelte_spa_router_scrollX, previousScrollState.__svelte_spa_router_scrollY);
    			} else {
    				// Otherwise this is a forward navigation: scroll to top
    				window.scrollTo(0, 0);
    			}
    		});
    	}

    	// Always have the latest value of loc
    	let lastLoc = null;

    	// Current object of the component loaded
    	let componentObj = null;

    	// Handle hash change events
    	// Listen to changes in the $loc store and update the page
    	// Do not use the $: syntax because it gets triggered by too many things
    	const unsubscribeLoc = loc.subscribe(async newLoc => {
    		lastLoc = newLoc;

    		// Find a route matching the location
    		let i = 0;

    		while (i < routesList.length) {
    			const match = routesList[i].match(newLoc.location);

    			if (!match) {
    				i++;
    				continue;
    			}

    			const detail = {
    				route: routesList[i].path,
    				location: newLoc.location,
    				querystring: newLoc.querystring,
    				userData: routesList[i].userData,
    				params: match && typeof match == 'object' && Object.keys(match).length
    				? match
    				: null
    			};

    			// Check if the route can be loaded - if all conditions succeed
    			if (!await routesList[i].checkConditions(detail)) {
    				// Don't display anything
    				$$invalidate(0, component = null);

    				componentObj = null;

    				// Trigger an event to notify the user, then exit
    				dispatchNextTick('conditionsFailed', detail);

    				return;
    			}

    			// Trigger an event to alert that we're loading the route
    			// We need to clone the object on every event invocation so we don't risk the object to be modified in the next tick
    			dispatchNextTick('routeLoading', Object.assign({}, detail));

    			// If there's a component to show while we're loading the route, display it
    			const obj = routesList[i].component;

    			// Do not replace the component if we're loading the same one as before, to avoid the route being unmounted and re-mounted
    			if (componentObj != obj) {
    				if (obj.loading) {
    					$$invalidate(0, component = obj.loading);
    					componentObj = obj;
    					$$invalidate(1, componentParams = obj.loadingParams);
    					$$invalidate(2, props = {});

    					// Trigger the routeLoaded event for the loading component
    					// Create a copy of detail so we don't modify the object for the dynamic route (and the dynamic route doesn't modify our object too)
    					dispatchNextTick('routeLoaded', Object.assign({}, detail, {
    						component,
    						name: component.name,
    						params: componentParams
    					}));
    				} else {
    					$$invalidate(0, component = null);
    					componentObj = null;
    				}

    				// Invoke the Promise
    				const loaded = await obj();

    				// Now that we're here, after the promise resolved, check if we still want this component, as the user might have navigated to another page in the meanwhile
    				if (newLoc != lastLoc) {
    					// Don't update the component, just exit
    					return;
    				}

    				// If there is a "default" property, which is used by async routes, then pick that
    				$$invalidate(0, component = loaded && loaded.default || loaded);

    				componentObj = obj;
    			}

    			// Set componentParams only if we have a match, to avoid a warning similar to `<Component> was created with unknown prop 'params'`
    			// Of course, this assumes that developers always add a "params" prop when they are expecting parameters
    			if (match && typeof match == 'object' && Object.keys(match).length) {
    				$$invalidate(1, componentParams = match);
    			} else {
    				$$invalidate(1, componentParams = null);
    			}

    			// Set static props, if any
    			$$invalidate(2, props = routesList[i].props);

    			// Dispatch the routeLoaded event then exit
    			// We need to clone the object on every event invocation so we don't risk the object to be modified in the next tick
    			dispatchNextTick('routeLoaded', Object.assign({}, detail, {
    				component,
    				name: component.name,
    				params: componentParams
    			})).then(() => {
    				params.set(componentParams);
    			});

    			return;
    		}

    		// If we're still here, there was no match, so show the empty component
    		$$invalidate(0, component = null);

    		componentObj = null;
    		params.set(undefined);
    	});

    	onDestroy(() => {
    		unsubscribeLoc();
    		popStateChanged && window.removeEventListener('popstate', popStateChanged);
    	});

    	const writable_props = ['routes', 'prefix', 'restoreScrollState'];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$1.warn(`<Router> was created with unknown prop '${key}'`);
    	});

    	function routeEvent_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	function routeEvent_handler_1(event) {
    		bubble.call(this, $$self, event);
    	}

    	$$self.$$set = $$props => {
    		if ('routes' in $$props) $$invalidate(3, routes = $$props.routes);
    		if ('prefix' in $$props) $$invalidate(4, prefix = $$props.prefix);
    		if ('restoreScrollState' in $$props) $$invalidate(5, restoreScrollState = $$props.restoreScrollState);
    	};

    	$$self.$capture_state = () => ({
    		readable,
    		writable,
    		derived,
    		tick,
    		_wrap: wrap$1,
    		wrap,
    		getLocation,
    		loc,
    		location,
    		querystring,
    		params,
    		push,
    		pop,
    		replace,
    		link,
    		updateLink,
    		linkOpts,
    		scrollstateHistoryHandler,
    		onDestroy,
    		createEventDispatcher,
    		afterUpdate,
    		parse,
    		routes,
    		prefix,
    		restoreScrollState,
    		RouteItem,
    		routesList,
    		component,
    		componentParams,
    		props,
    		dispatch,
    		dispatchNextTick,
    		previousScrollState,
    		popStateChanged,
    		lastLoc,
    		componentObj,
    		unsubscribeLoc
    	});

    	$$self.$inject_state = $$props => {
    		if ('routes' in $$props) $$invalidate(3, routes = $$props.routes);
    		if ('prefix' in $$props) $$invalidate(4, prefix = $$props.prefix);
    		if ('restoreScrollState' in $$props) $$invalidate(5, restoreScrollState = $$props.restoreScrollState);
    		if ('component' in $$props) $$invalidate(0, component = $$props.component);
    		if ('componentParams' in $$props) $$invalidate(1, componentParams = $$props.componentParams);
    		if ('props' in $$props) $$invalidate(2, props = $$props.props);
    		if ('previousScrollState' in $$props) previousScrollState = $$props.previousScrollState;
    		if ('popStateChanged' in $$props) popStateChanged = $$props.popStateChanged;
    		if ('lastLoc' in $$props) lastLoc = $$props.lastLoc;
    		if ('componentObj' in $$props) componentObj = $$props.componentObj;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*restoreScrollState*/ 32) {
    			// Update history.scrollRestoration depending on restoreScrollState
    			history.scrollRestoration = restoreScrollState ? 'manual' : 'auto';
    		}
    	};

    	return [
    		component,
    		componentParams,
    		props,
    		routes,
    		prefix,
    		restoreScrollState,
    		routeEvent_handler,
    		routeEvent_handler_1
    	];
    }

    class Router extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {
    			routes: 3,
    			prefix: 4,
    			restoreScrollState: 5
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Router",
    			options,
    			id: create_fragment$3.name
    		});
    	}

    	get routes() {
    		throw new Error_1("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set routes(value) {
    		throw new Error_1("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get prefix() {
    		throw new Error_1("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set prefix(value) {
    		throw new Error_1("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get restoreScrollState() {
    		throw new Error_1("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set restoreScrollState(value) {
    		throw new Error_1("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    class ResponseVariable {
        constructor(index, prevRV = undefined) {
            this.index = index;
            this._max = 5;
            this.terms = [];
            this.binaryCounts = 0;
            this.prevRV = prevRV;
            if (prevRV) {
                prevRV.nextRV = this;
            }
            this.update();
        }
        update() {
            var _a;
            let newBinaryCounts = Math.ceil(Math.log2(this._max + 1));
            if (newBinaryCounts == this.binaryCounts) ;
            else if (newBinaryCounts > this.binaryCounts) {
                for (let i = 0; i < newBinaryCounts - this.binaryCounts; i++) {
                    let newIndex = i + this.binaryCounts;
                    this.terms.push({
                        coef: Math.pow(2, i),
                        value: 0,
                        index: newIndex,
                    });
                }
            }
            else {
                this.terms.splice(newBinaryCounts - this.binaryCounts);
            }
            this.binaryCounts = newBinaryCounts;
            if (this.prevRV === undefined) {
                for (let i = 0; i < this.binaryCounts; i++) {
                    this.terms[i].index = i;
                }
            }
            else {
                const prevRVTerms = this.prevRV.terms;
                const baseIndex = prevRVTerms[prevRVTerms.length - 1].index + 1;
                for (let i = 0; i < this.binaryCounts; i++) {
                    this.terms[i].index = i + baseIndex;
                }
            }
            (_a = this.nextRV) === null || _a === void 0 ? void 0 : _a.update();
        }
        get max() {
            return this._max;
        }
        set max(value) {
            this._max = value;
            this.update();
        }
        get value() {
            return this.terms.map((term) => term.value * term.coef).reduce((a, b) => a + b, 0);
        }
        expandQubo() {
            let text = "";
            for (let i = 0; i < this.binaryCounts; i++) {
                text += `${Math.pow(2, i)}×q${this.terms[i].index} + `;
            }
            text = text.slice(0, -2);
            return text;
        }
    }

    class ObjectiveFunctions {
        constructor() {
            this.terms = [];
        }
        addResponseVariable() {
            const rvs = this.terms;
            rvs.push({ rv: new ResponseVariable(rvs.length, rvs.length > 0 ? rvs[rvs.length - 1].rv : undefined), coef: 1 });
        }
        get responseVariable() {
            return this.terms.map(term => term.rv);
        }
        expand() {
            return this.terms.map(term => `${term.coef} × x${term.rv.index}`).join(" + ");
        }
        expandQubo() {
            return this.terms.map((term) => `${term.coef} × (${term.rv.terms.map(term => `${term.coef} × q${term.index}`).join(" + ")})`).join(" + ");
        }
        expandQubo2() {
            return this.terms.map((term) => term.rv.terms.map(termQ => `${term.coef * termQ.coef} × q${termQ.index}`).join(" + ")).join(" + ");
        }
        value() {
            return this.terms.map(term => term.coef * term.rv.value).reduce((a, b) => a + b, 0);
        }
    }

    /* src\QuboFormulation.svelte generated by Svelte v3.42.6 */
    const file$2 = "src\\QuboFormulation.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[10] = list[i];
    	child_ctx[11] = list;
    	child_ctx[12] = i;
    	return child_ctx;
    }

    function get_each_context_1$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[10] = list[i];
    	child_ctx[13] = list;
    	child_ctx[14] = i;
    	return child_ctx;
    }

    // (51:24) {#each term.rv.terms as term}
    function create_each_block_1$1(ctx) {
    	let t0;
    	let t1_value = /*term*/ ctx[10].index + "";
    	let t1;
    	let t2;
    	let input;
    	let mounted;
    	let dispose;

    	function input_input_handler() {
    		/*input_input_handler*/ ctx[4].call(input, /*each_value_1*/ ctx[13], /*term_index_1*/ ctx[14]);
    	}

    	function input_handler_1(...args) {
    		return /*input_handler_1*/ ctx[5](/*term*/ ctx[10], ...args);
    	}

    	const block = {
    		c: function create() {
    			t0 = text("q");
    			t1 = text(t1_value);
    			t2 = space();
    			input = element("input");
    			attr_dev(input, "type", "number");
    			attr_dev(input, "class", "svelte-85calt");
    			add_location(input, file$2, 52, 28, 1555);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, input, anchor);
    			set_input_value(input, /*term*/ ctx[10].value);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", input_input_handler),
    					listen_dev(input, "input", input_handler_1, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*objectiveFunction*/ 1 && t1_value !== (t1_value = /*term*/ ctx[10].index + "")) set_data_dev(t1, t1_value);

    			if (dirty & /*objectiveFunction*/ 1 && to_number(input.value) !== /*term*/ ctx[10].value) {
    				set_input_value(input, /*term*/ ctx[10].value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(input);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1$1.name,
    		type: "each",
    		source: "(51:24) {#each term.rv.terms as term}",
    		ctx
    	});

    	return block;
    }

    // (34:12) {#each objectiveFunction.terms as term }
    function create_each_block$1(ctx) {
    	let tr;
    	let th;
    	let t0;
    	let t1_value = /*term*/ ctx[10].rv.index + "";
    	let t1;
    	let t2;
    	let td0;
    	let input0;
    	let t3;
    	let td1;
    	let t4_value = /*term*/ ctx[10].rv.expandQubo() + "";
    	let t4;
    	let t5;
    	let td2;
    	let t6;
    	let td3;
    	let p;
    	let t7_value = /*term*/ ctx[10].rv.value + "";
    	let t7;
    	let t8;
    	let td4;
    	let input1;
    	let mounted;
    	let dispose;

    	function input0_input_handler() {
    		/*input0_input_handler*/ ctx[2].call(input0, /*each_value*/ ctx[11], /*term_index*/ ctx[12]);
    	}

    	let each_value_1 = /*term*/ ctx[10].rv.terms;
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1$1(get_each_context_1$1(ctx, each_value_1, i));
    	}

    	function input1_input_handler() {
    		/*input1_input_handler*/ ctx[6].call(input1, /*each_value*/ ctx[11], /*term_index*/ ctx[12]);
    	}

    	function input_handler_2(...args) {
    		return /*input_handler_2*/ ctx[7](/*term*/ ctx[10], ...args);
    	}

    	const block = {
    		c: function create() {
    			tr = element("tr");
    			th = element("th");
    			t0 = text("x");
    			t1 = text(t1_value);
    			t2 = space();
    			td0 = element("td");
    			input0 = element("input");
    			t3 = space();
    			td1 = element("td");
    			t4 = text(t4_value);
    			t5 = space();
    			td2 = element("td");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t6 = space();
    			td3 = element("td");
    			p = element("p");
    			t7 = text(t7_value);
    			t8 = space();
    			td4 = element("td");
    			input1 = element("input");
    			attr_dev(th, "class", "svelte-85calt");
    			add_location(th, file$2, 35, 20, 912);
    			attr_dev(input0, "type", "number");
    			attr_dev(input0, "class", "svelte-85calt");
    			add_location(input0, file$2, 37, 24, 989);
    			attr_dev(td0, "class", "svelte-85calt");
    			add_location(td0, file$2, 36, 20, 959);
    			attr_dev(td1, "class", "svelte-85calt");
    			add_location(td1, file$2, 45, 20, 1320);
    			attr_dev(td2, "class", "svelte-85calt");
    			add_location(td2, file$2, 49, 20, 1423);
    			add_location(p, file$2, 60, 23, 1880);
    			attr_dev(td3, "class", "svelte-85calt");
    			add_location(td3, file$2, 59, 20, 1851);
    			attr_dev(input1, "type", "number");
    			attr_dev(input1, "class", "svelte-85calt");
    			add_location(input1, file$2, 63, 28, 1986);
    			attr_dev(td4, "class", "svelte-85calt");
    			add_location(td4, file$2, 62, 20, 1952);
    			add_location(tr, file$2, 34, 16, 886);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, tr, anchor);
    			append_dev(tr, th);
    			append_dev(th, t0);
    			append_dev(th, t1);
    			append_dev(tr, t2);
    			append_dev(tr, td0);
    			append_dev(td0, input0);
    			set_input_value(input0, /*term*/ ctx[10].rv.max);
    			append_dev(tr, t3);
    			append_dev(tr, td1);
    			append_dev(td1, t4);
    			append_dev(tr, t5);
    			append_dev(tr, td2);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(td2, null);
    			}

    			append_dev(tr, t6);
    			append_dev(tr, td3);
    			append_dev(td3, p);
    			append_dev(p, t7);
    			append_dev(tr, t8);
    			append_dev(tr, td4);
    			append_dev(td4, input1);
    			set_input_value(input1, /*term*/ ctx[10].coef);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", input0_input_handler),
    					listen_dev(input0, "input", /*input_handler*/ ctx[3], false, false, false),
    					listen_dev(input1, "input", input1_input_handler),
    					listen_dev(input1, "input", input_handler_2, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*objectiveFunction*/ 1 && t1_value !== (t1_value = /*term*/ ctx[10].rv.index + "")) set_data_dev(t1, t1_value);

    			if (dirty & /*objectiveFunction*/ 1 && to_number(input0.value) !== /*term*/ ctx[10].rv.max) {
    				set_input_value(input0, /*term*/ ctx[10].rv.max);
    			}

    			if (dirty & /*objectiveFunction*/ 1 && t4_value !== (t4_value = /*term*/ ctx[10].rv.expandQubo() + "")) set_data_dev(t4, t4_value);

    			if (dirty & /*objectiveFunction, ontermchange*/ 3) {
    				each_value_1 = /*term*/ ctx[10].rv.terms;
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1$1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(td2, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
    			}

    			if (dirty & /*objectiveFunction*/ 1 && t7_value !== (t7_value = /*term*/ ctx[10].rv.value + "")) set_data_dev(t7, t7_value);

    			if (dirty & /*objectiveFunction*/ 1 && to_number(input1.value) !== /*term*/ ctx[10].coef) {
    				set_input_value(input1, /*term*/ ctx[10].coef);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(tr);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(34:12) {#each objectiveFunction.terms as term }",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let h1;
    	let t1;
    	let h2;
    	let t3;
    	let main;
    	let table;
    	let thead;
    	let th0;
    	let t5;
    	let th1;
    	let t7;
    	let th2;
    	let t9;
    	let th3;
    	let t11;
    	let th4;
    	let t13;
    	let th5;
    	let t15;
    	let tbody;
    	let t16;
    	let tr;
    	let button;
    	let t18;
    	let div;
    	let dl;
    	let dt0;
    	let dd0;
    	let p0;
    	let t20_value = /*objectiveFunction*/ ctx[0].expand() + "";
    	let t20;
    	let t21;
    	let dt1;
    	let dd1;
    	let p1;
    	let t23_value = /*objectiveFunction*/ ctx[0].expandQubo() + "";
    	let t23;
    	let t24;
    	let dt2;
    	let dd2;
    	let p2;
    	let t26_value = /*objectiveFunction*/ ctx[0].expandQubo2() + "";
    	let t26;
    	let t27;
    	let dt3;
    	let dd3;
    	let p3;
    	let t29_value = /*objectiveFunction*/ ctx[0].value() + "";
    	let t29;
    	let mounted;
    	let dispose;
    	let each_value = /*objectiveFunction*/ ctx[0].terms;
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "定式化について学ぼう！";
    			t1 = space();
    			h2 = element("h2");
    			h2.textContent = "つかいかた";
    			t3 = space();
    			main = element("main");
    			table = element("table");
    			thead = element("thead");
    			th0 = element("th");
    			th0.textContent = "目的変数名";
    			t5 = space();
    			th1 = element("th");
    			th1.textContent = "最大";
    			t7 = space();
    			th2 = element("th");
    			th2.textContent = "QUBOの式化";
    			t9 = space();
    			th3 = element("th");
    			th3.textContent = "バイナリ変数の値";
    			t11 = space();
    			th4 = element("th");
    			th4.textContent = "計算結果";
    			t13 = space();
    			th5 = element("th");
    			th5.textContent = "目的関数の係数";
    			t15 = space();
    			tbody = element("tbody");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t16 = space();
    			tr = element("tr");
    			button = element("button");
    			button.textContent = "+";
    			t18 = space();
    			div = element("div");
    			dl = element("dl");
    			dt0 = element("dt");
    			dt0.textContent = "目的関数";
    			dd0 = element("dd");
    			p0 = element("p");
    			t20 = text(t20_value);
    			t21 = space();
    			dt1 = element("dt");
    			dt1.textContent = "目的関数(QUBO)";
    			dd1 = element("dd");
    			p1 = element("p");
    			t23 = text(t23_value);
    			t24 = space();
    			dt2 = element("dt");
    			dt2.textContent = "目的関数(QUBO)展開";
    			dd2 = element("dd");
    			p2 = element("p");
    			t26 = text(t26_value);
    			t27 = space();
    			dt3 = element("dt");
    			dt3.textContent = "目的関数の計算結果";
    			dd3 = element("dd");
    			p3 = element("p");
    			t29 = text(t29_value);
    			add_location(h1, file$2, 19, 0, 532);
    			add_location(h2, file$2, 20, 0, 554);
    			attr_dev(th0, "class", "svelte-85calt");
    			add_location(th0, file$2, 25, 12, 622);
    			attr_dev(th1, "class", "svelte-85calt");
    			add_location(th1, file$2, 26, 12, 650);
    			attr_dev(th2, "class", "svelte-85calt");
    			add_location(th2, file$2, 27, 12, 675);
    			attr_dev(th3, "class", "svelte-85calt");
    			add_location(th3, file$2, 28, 12, 705);
    			attr_dev(th4, "class", "svelte-85calt");
    			add_location(th4, file$2, 29, 12, 736);
    			attr_dev(th5, "class", "svelte-85calt");
    			add_location(th5, file$2, 30, 12, 763);
    			add_location(thead, file$2, 24, 8, 601);
    			add_location(button, file$2, 73, 16, 2360);
    			add_location(tr, file$2, 72, 12, 2338);
    			add_location(tbody, file$2, 32, 8, 807);
    			attr_dev(table, "class", "svelte-85calt");
    			add_location(table, file$2, 23, 4, 584);
    			add_location(dt0, file$2, 85, 11, 2707);
    			add_location(p0, file$2, 86, 15, 2738);
    			add_location(dd0, file$2, 86, 11, 2734);
    			add_location(dt1, file$2, 87, 11, 2794);
    			add_location(p1, file$2, 88, 15, 2831);
    			add_location(dd1, file$2, 88, 11, 2827);
    			add_location(dt2, file$2, 89, 12, 2892);
    			add_location(p2, file$2, 90, 15, 2931);
    			add_location(dd2, file$2, 90, 11, 2927);
    			add_location(dt3, file$2, 91, 11, 2992);
    			add_location(p3, file$2, 92, 15, 3027);
    			add_location(dd3, file$2, 92, 11, 3023);
    			attr_dev(dl, "class", "objective-function svelte-85calt");
    			add_location(dl, file$2, 84, 8, 2663);
    			add_location(div, file$2, 83, 4, 2648);
    			add_location(main, file$2, 22, 0, 572);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, h2, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, main, anchor);
    			append_dev(main, table);
    			append_dev(table, thead);
    			append_dev(thead, th0);
    			append_dev(thead, t5);
    			append_dev(thead, th1);
    			append_dev(thead, t7);
    			append_dev(thead, th2);
    			append_dev(thead, t9);
    			append_dev(thead, th3);
    			append_dev(thead, t11);
    			append_dev(thead, th4);
    			append_dev(thead, t13);
    			append_dev(thead, th5);
    			append_dev(table, t15);
    			append_dev(table, tbody);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(tbody, null);
    			}

    			append_dev(tbody, t16);
    			append_dev(tbody, tr);
    			append_dev(tr, button);
    			append_dev(main, t18);
    			append_dev(main, div);
    			append_dev(div, dl);
    			append_dev(dl, dt0);
    			append_dev(dl, dd0);
    			append_dev(dd0, p0);
    			append_dev(p0, t20);
    			append_dev(p0, t21);
    			append_dev(dl, dt1);
    			append_dev(dl, dd1);
    			append_dev(dd1, p1);
    			append_dev(p1, t23);
    			append_dev(p1, t24);
    			append_dev(dl, dt2);
    			append_dev(dl, dd2);
    			append_dev(dd2, p2);
    			append_dev(p2, t26);
    			append_dev(p2, t27);
    			append_dev(dl, dt3);
    			append_dev(dl, dd3);
    			append_dev(dd3, p3);
    			append_dev(p3, t29);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler*/ ctx[8], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*objectiveFunction, ontermchange*/ 3) {
    				each_value = /*objectiveFunction*/ ctx[0].terms;
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(tbody, t16);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty & /*objectiveFunction*/ 1 && t20_value !== (t20_value = /*objectiveFunction*/ ctx[0].expand() + "")) set_data_dev(t20, t20_value);
    			if (dirty & /*objectiveFunction*/ 1 && t23_value !== (t23_value = /*objectiveFunction*/ ctx[0].expandQubo() + "")) set_data_dev(t23, t23_value);
    			if (dirty & /*objectiveFunction*/ 1 && t26_value !== (t26_value = /*objectiveFunction*/ ctx[0].expandQubo2() + "")) set_data_dev(t26, t26_value);
    			if (dirty & /*objectiveFunction*/ 1 && t29_value !== (t29_value = /*objectiveFunction*/ ctx[0].value() + "")) set_data_dev(t29, t29_value);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h1);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(h2);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(main);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('QuboFormulation', slots, []);
    	let objectiveFunction = new ObjectiveFunctions();

    	function startup() {
    		objectiveFunction.addResponseVariable();
    		objectiveFunction.addResponseVariable();
    	}

    	function ontermchange(e, term) {
    		if (parseInt(e.target.value) > 1) {
    			term.value = 1;
    		} else if (parseInt(e.target.value) < 0) {
    			term.value = 0;
    		}

    		$$invalidate(0, objectiveFunction);
    	}

    	startup();
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<QuboFormulation> was created with unknown prop '${key}'`);
    	});

    	function input0_input_handler(each_value, term_index) {
    		each_value[term_index].rv.max = to_number(this.value);
    		$$invalidate(0, objectiveFunction);
    	}

    	const input_handler = () => {
    		$$invalidate(0, objectiveFunction);
    	};

    	function input_input_handler(each_value_1, term_index_1) {
    		each_value_1[term_index_1].value = to_number(this.value);
    		$$invalidate(0, objectiveFunction);
    	}

    	const input_handler_1 = (term, e) => {
    		ontermchange(e, term);
    	};

    	function input1_input_handler(each_value, term_index) {
    		each_value[term_index].coef = to_number(this.value);
    		$$invalidate(0, objectiveFunction);
    	}

    	const input_handler_2 = (term, e) => {
    		ontermchange(e, term);
    	};

    	const click_handler = () => {
    		objectiveFunction.addResponseVariable();
    		$$invalidate(0, objectiveFunction);
    	};

    	$$self.$capture_state = () => ({
    		ObjectiveFunctions,
    		objectiveFunction,
    		startup,
    		ontermchange
    	});

    	$$self.$inject_state = $$props => {
    		if ('objectiveFunction' in $$props) $$invalidate(0, objectiveFunction = $$props.objectiveFunction);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		objectiveFunction,
    		ontermchange,
    		input0_input_handler,
    		input_handler,
    		input_input_handler,
    		input_handler_1,
    		input1_input_handler,
    		input_handler_2,
    		click_handler
    	];
    }

    class QuboFormulation extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "QuboFormulation",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src\QuboIsingModel.svelte generated by Svelte v3.42.6 */

    const { console: console_1 } = globals;
    const file$1 = "src\\QuboIsingModel.svelte";

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
    			add_location(line, file$1, 240, 3, 6900);
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
    			add_location(rect, file$1, 273, 5, 7527);
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
    			add_location(rect, file$1, 264, 5, 7381);
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
    			add_location(line, file$1, 250, 3, 7115);
    			attr_dev(text0, "y", "-30");
    			attr_dev(text0, "text-anchor", "middle");
    			attr_dev(text0, "dominant-baseline", "central");
    			attr_dev(text0, "class", "svelte-1kyqezv");
    			add_location(text0, file$1, 282, 4, 7671);
    			attr_dev(text1, "text-anchor", "middle");
    			attr_dev(text1, "dominant-baseline", "central");
    			attr_dev(text1, "class", "svelte-1kyqezv");
    			add_location(text1, file$1, 285, 4, 7771);
    			attr_dev(g, "transform", g_transform_value = "translate(" + /*edge*/ ctx[32].centerX + "," + /*edge*/ ctx[32].centerY + ")");
    			add_location(g, file$1, 257, 3, 7224);
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

    			add_location(circle, file$1, 298, 4, 8109);
    			attr_dev(text0, "y", "-40");
    			attr_dev(text0, "text-anchor", "middle");
    			attr_dev(text0, "dominant-baseline", "central");
    			attr_dev(text0, "class", "svelte-1kyqezv");
    			add_location(text0, file$1, 306, 4, 8281);
    			attr_dev(text1, "text-anchor", "middle");
    			attr_dev(text1, "dominant-baseline", "central");
    			attr_dev(text1, "class", "svelte-1kyqezv");
    			add_location(text1, file$1, 309, 4, 8385);
    			attr_dev(g, "transform", g_transform_value = "translate(" + /*vertex*/ ctx[29].position[0] + "," + /*vertex*/ ctx[29].position[1] + ")");
    			add_location(g, file$1, 291, 3, 7920);
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
    			add_location(circle, file$1, 316, 3, 8528);
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

    			add_location(p, file$1, 389, 4, 10082);
    			attr_dev(th0, "class", "svelte-1kyqezv");
    			add_location(th0, file$1, 392, 6, 10128);
    			attr_dev(th1, "class", "svelte-1kyqezv");
    			add_location(th1, file$1, 393, 6, 10149);
    			attr_dev(th2, "class", "svelte-1kyqezv");
    			add_location(th2, file$1, 394, 6, 10168);
    			attr_dev(th3, "class", "svelte-1kyqezv");
    			add_location(th3, file$1, 395, 6, 10191);
    			add_location(thead, file$1, 391, 5, 10113);
    			add_location(tbody, file$1, 397, 5, 10229);
    			attr_dev(table, "class", "svelte-1kyqezv");
    			add_location(table, file$1, 390, 4, 10099);
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

    			add_location(p, file$1, 347, 4, 9145);
    			attr_dev(th0, "class", "svelte-1kyqezv");
    			add_location(th0, file$1, 350, 6, 9191);
    			attr_dev(th1, "class", "svelte-1kyqezv");
    			add_location(th1, file$1, 351, 6, 9209);
    			attr_dev(th2, "class", "svelte-1kyqezv");
    			add_location(th2, file$1, 352, 6, 9228);
    			attr_dev(th3, "class", "svelte-1kyqezv");
    			add_location(th3, file$1, 353, 6, 9248);
    			add_location(thead, file$1, 349, 5, 9176);
    			add_location(tbody, file$1, 355, 5, 9283);
    			attr_dev(table, "class", "svelte-1kyqezv");
    			add_location(table, file$1, 348, 4, 9162);
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
    			attr_dev(td0, "class", "svelte-1kyqezv");
    			add_location(td0, file$1, 405, 8, 10414);
    			input.value = input_value_value = /*edge*/ ctx[32].weight;
    			attr_dev(input, "class", "svelte-1kyqezv");
    			add_location(input, file$1, 407, 10, 10459);
    			attr_dev(td1, "class", "svelte-1kyqezv");
    			add_location(td1, file$1, 406, 8, 10444);
    			attr_dev(td2, "class", "svelte-1kyqezv");
    			add_location(td2, file$1, 413, 8, 10602);
    			attr_dev(td3, "class", "svelte-1kyqezv");
    			add_location(td3, file$1, 417, 8, 10705);
    			attr_dev(tr, "class", "svelte-1kyqezv");
    			toggle_class(tr, "selected", /*edge*/ ctx[32] === /*selected*/ ctx[1]);
    			add_location(tr, file$1, 399, 7, 10280);
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
    			attr_dev(td0, "class", "svelte-1kyqezv");
    			add_location(td0, file$1, 363, 8, 9477);
    			input.value = input_value_value = /*vertex*/ ctx[29].weight;
    			attr_dev(input, "class", "svelte-1kyqezv");
    			add_location(input, file$1, 365, 10, 9526);
    			attr_dev(td1, "class", "svelte-1kyqezv");
    			add_location(td1, file$1, 364, 8, 9511);
    			attr_dev(td2, "class", "svelte-1kyqezv");
    			add_location(td2, file$1, 371, 8, 9673);
    			add_location(button, file$1, 373, 9, 9722);
    			attr_dev(td3, "class", "svelte-1kyqezv");
    			add_location(td3, file$1, 372, 8, 9707);
    			attr_dev(tr, "class", "svelte-1kyqezv");
    			toggle_class(tr, "selected", /*vertex*/ ctx[29] === /*selected*/ ctx[1]);
    			add_location(tr, file$1, 357, 7, 9339);
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

    function create_fragment$1(ctx) {
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
    			t4 = text("\r\n\tこの部品をドラッグしてみよう! 頂点が追加できるよ!");
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
    			add_location(h1, file$1, 211, 0, 6170);
    			add_location(h2, file$1, 212, 0, 6193);
    			attr_dev(rect0, "width", "40");
    			attr_dev(rect0, "height", "40");
    			attr_dev(rect0, "fill", "#ffffff");
    			attr_dev(rect0, "stroke", "black");
    			add_location(rect0, file$1, 215, 2, 6247);
    			attr_dev(circle0, "cx", "20");
    			attr_dev(circle0, "cy", "20");
    			attr_dev(circle0, "r", "15");
    			attr_dev(circle0, "fill", "#ffffff");
    			attr_dev(circle0, "stroke", "black");
    			add_location(circle0, file$1, 216, 2, 6312);
    			attr_dev(svg0, "width", "40");
    			attr_dev(svg0, "height", "40");
    			attr_dev(svg0, "class", "svelte-1kyqezv");
    			add_location(svg0, file$1, 214, 1, 6215);
    			add_location(p0, file$1, 213, 0, 6209);
    			add_location(p1, file$1, 220, 0, 6421);
    			add_location(p2, file$1, 223, 0, 6479);
    			attr_dev(rect1, "width", "80");
    			attr_dev(rect1, "height", "80");
    			attr_dev(rect1, "fill", "#ffffff");
    			attr_dev(rect1, "stroke", "black");
    			add_location(rect1, file$1, 235, 3, 6738);
    			attr_dev(circle1, "cx", "40");
    			attr_dev(circle1, "cy", "40");
    			attr_dev(circle1, "r", "30");
    			attr_dev(circle1, "fill", "#ffffff");
    			attr_dev(circle1, "stroke", "black");
    			add_location(circle1, file$1, 236, 3, 6804);
    			attr_dev(g, "transform", "translate(0,10)");
    			add_location(g, file$1, 234, 2, 6671);
    			attr_dev(svg1, "width", "100%");
    			attr_dev(svg1, "height", "100%");
    			attr_dev(svg1, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg1, "class", "svelte-1kyqezv");
    			add_location(svg1, file$1, 227, 1, 6541);
    			attr_dev(p3, "class", "svelte-1kyqezv");
    			toggle_class(p3, "not-selected", /*selectedInspectorTab*/ ctx[5] !== "vertex");
    			add_location(p3, file$1, 328, 3, 8736);
    			attr_dev(p4, "class", "svelte-1kyqezv");
    			toggle_class(p4, "not-selected", /*selectedInspectorTab*/ ctx[5] !== "edge");
    			add_location(p4, file$1, 336, 3, 8899);
    			attr_dev(div0, "class", "inspector-tab svelte-1kyqezv");
    			add_location(div0, file$1, 327, 2, 8704);
    			attr_dev(div1, "class", "inspector-main svelte-1kyqezv");
    			add_location(div1, file$1, 345, 2, 9067);
    			attr_dev(div2, "class", "inspector svelte-1kyqezv");
    			add_location(div2, file$1, 326, 1, 8677);
    			add_location(p5, file$1, 430, 2, 10911);
    			add_location(p6, file$1, 431, 2, 10929);
    			add_location(p7, file$1, 432, 2, 10958);
    			add_location(p8, file$1, 433, 2, 10973);
    			add_location(button0, file$1, 434, 2, 11012);
    			add_location(button1, file$1, 441, 2, 11129);
    			attr_dev(label, "id", "file-upload-label");
    			attr_dev(label, "for", "json-upload");
    			add_location(label, file$1, 443, 4, 11199);
    			add_location(button2, file$1, 442, 2, 11186);
    			attr_dev(input, "type", "file");
    			set_style(input, "visibility", "hidden");
    			attr_dev(input, "id", "json-upload");
    			add_location(input, file$1, 447, 2, 11298);
    			attr_dev(div3, "class", "result svelte-1kyqezv");
    			add_location(div3, file$1, 429, 1, 10887);
    			attr_dev(main, "class", "svelte-1kyqezv");
    			add_location(main, file$1, 226, 0, 6532);
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
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('QuboIsingModel', slots, []);
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
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<QuboIsingModel> was created with unknown prop '${key}'`);
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

    class QuboIsingModel extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {}, null, [-1, -1]);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "QuboIsingModel",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src\App.svelte generated by Svelte v3.42.6 */
    const file = "src\\App.svelte";

    function create_fragment(ctx) {
    	let nav;
    	let a0;
    	let t1;
    	let a1;
    	let t3;
    	let router;
    	let current;
    	let mounted;
    	let dispose;

    	router = new Router({
    			props: { routes: /*routes*/ ctx[0] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			nav = element("nav");
    			a0 = element("a");
    			a0.textContent = "イジンングモデルを学ぼう";
    			t1 = space();
    			a1 = element("a");
    			a1.textContent = "定式化";
    			t3 = space();
    			create_component(router.$$.fragment);
    			attr_dev(a0, "href", "/");
    			add_location(a0, file, 11, 1, 320);
    			attr_dev(a1, "href", "/formulation");
    			add_location(a1, file, 12, 1, 360);
    			attr_dev(nav, "class", "svelte-xijafh");
    			add_location(nav, file, 10, 0, 312);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, nav, anchor);
    			append_dev(nav, a0);
    			append_dev(nav, t1);
    			append_dev(nav, a1);
    			insert_dev(target, t3, anchor);
    			mount_component(router, target, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					action_destroyer(link.call(null, a0)),
    					action_destroyer(link.call(null, a1))
    				];

    				mounted = true;
    			}
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(router.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(router.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(nav);
    			if (detaching) detach_dev(t3);
    			destroy_component(router, detaching);
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

    	const routes = {
    		'/': QuboIsingModel,
    		"/formulation": QuboFormulation
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		Router,
    		link,
    		QuboFormulation,
    		QuboIsingModel,
    		routes
    	});

    	return [routes];
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

    const app = new App({
        target: document.body,
        props: {
            name: 'world'
        }
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
