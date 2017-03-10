const $w = window;

const __name__: string = 'jsMind';
// library version
const __version__: string = '0.4a';
// author
const __author__ = 'wfsovereign';

// an noop function define
let _noop = function () {
};
const logger = console;

// check global constiables
// if (typeof $w[__name__] != 'undefined') {
//     logger.log(__name__ + ' has been already exist.');
//     return;
// }

const DEFAULT_OPTIONS = {
    container: '',   // id of the container
    editable: false, // you can change it in your options
    theme: null,
    mode: 'full',     // full or side
    support_html: true,

    view: {
        hmargin: 100,
        vmargin: 50,
        line_width: 2,
        line_color: '#555'
    },
    layout: {
        hspace: 30,
        vspace: 20,
        pspace: 13
    },
    default_event_handle: {
        enable_mousedown_handle: true,
        enable_click_handle: true,
        enable_dblclick_handle: true
    },
    shortcut: {
        enable: true,
        handles: {},
        mapping: {
            addchild: 45, // Insert
            addbrother: 13, // Enter
            editnode: 113,// F2
            delnode: 46, // Delete
            toggle: 32, // Space
            left: 37, // Left
            up: 38, // Up
            right: 39, // Right
            down: 40, // Down
        }
    },
};

const $d = $w.document;
const $g = function (id) {
    return $d.getElementById(id);
};
const $c = function (tag) {
    return $d.createElement(tag);
};
const $t = function (n, t) {
    if (n.hasChildNodes()) { n.firstChild.nodeValue = t; } else { n.appendChild($d.createTextNode(t)); }
};
const $h = function (n, t) {
    n.innerHTML = t;
};
if (typeof String.prototype.startsWith !== 'function') {
    String.prototype.startsWith = function (p) {
        return this.slice(0, p.length) === p;
    };
}


interface MindMapModuleOpts {
    container?: Array<any>;
    mode?: any;
    layout?: any;
    support_html?: any;
    view?: any;
    shortcut?: any;
    editable?: boolean;
    default_event_handle?: any;
    theme?: any;
}


class MindMapModule {

    version: string = __version__;
    opts: MindMapModuleOpts = {};
    options = this.opts;
    inited = false;
    mind = null;
    event_handles = [];
    direction = { left: -1, center: 0, right: 1 };
    event_type = { show: 1, resize: 2, edit: 3, select: 4 };
    data;
    layout;
    view;
    shortcut;


    constructor() {
        if (this.opts.container == null || this.opts.container.length == 0) {
            logger.error('the options.container should not be empty.');
            return;
        }
    }


    init() {
        if (this.inited) {return;}
        this.inited = true;

        const opts = this.options;

        const opts_layout = {
            mode: opts.mode,
            hspace: opts.layout.hspace,
            vspace: opts.layout.vspace,
            pspace: opts.layout.pspace
        };
        const opts_view = {
            container: opts.container,
            support_html: opts.support_html,
            hmargin: opts.view.hmargin,
            vmargin: opts.view.vmargin,
            line_width: opts.view.line_width,
            line_color: opts.view.line_color
        };
        // create instance of function provider
        this.data = new jm.data_provider(this);
        this.layout = new jm.layout_provider(this, opts_layout);
        this.view = new jm.view_provider(this, opts_view);
        this.shortcut = new jm.shortcut_provider(this, opts.shortcut);

        this.data.init();
        this.layout.init();
        this.view.init();
        this.shortcut.init();

        this._event_bind();

        jm.init_plugins(this);
    }

    enable_edit() {
        this.options.editable = true;
    }

    disable_edit() {
        this.options.editable = false;
    }

    // call enable_event_handle('dblclick')
    // options are 'mousedown', 'click', 'dblclick'
    enable_event_handle(event_handle) {
        this.options.default_event_handle['enable_' + event_handle + '_handle'] = true;
    }

    // call disable_event_handle('dblclick')
    // options are 'mousedown', 'click', 'dblclick'
    disable_event_handle(event_handle) {
        this.options.default_event_handle['enable_' + event_handle + '_handle'] = false;
    }

    get_editable() {
        return this.options.editable;
    }

    set_theme(theme) {
        const theme_old = this.options.theme;
        this.options.theme = (!!theme) ? theme : null;
        if (theme_old != this.options.theme) {
            this.view.reset_theme();
            this.view.reset_custom_style();
        }
    }

    _event_bind() {
        this.view.add_event(this, 'mousedown', this.mousedown_handle);
        this.view.add_event(this, 'click', this.click_handle);
        this.view.add_event(this, 'dblclick', this.dblclick_handle);
    }

    mousedown_handle(e) {
        if (!this.options.default_event_handle['enable_mousedown_handle']) {
            return;
        }
        const element = e.target || event.srcElement;
        const nodeid = this.view.get_binded_nodeid(element);
        if (!!nodeid) {
            this.select_node(nodeid);
        } else {
            this.select_clear();
        }
    }

    click_handle(e) {
        if (!this.options.default_event_handle['enable_click_handle']) {
            return;
        }
        const element = e.target || event.srcElement;
        const isexpander = this.view.is_expander(element);
        if (isexpander) {
            const nodeid = this.view.get_binded_nodeid(element);
            if (!!nodeid) {
                this.toggle_node(nodeid);
            }
        }
    }

    dblclick_handle(e) {
        if (!this.options.default_event_handle['enable_dblclick_handle']) {
            return;
        }
        if (this.get_editable()) {
            const element = e.target || event.srcElement;
            const nodeid = this.view.get_binded_nodeid(element);
            if (!!nodeid && nodeid !== 'root') {
                this.begin_edit(nodeid);
            }
        }
    }

    begin_edit(node) {
        if (!jm.util.is_node(node)) {
            return this.begin_edit(this.get_node(node));
        }
        if (this.get_editable()) {
            if (!!node) {
                this.view.edit_node_begin(node);
            } else {
                logger.error('the node can not be found');
            }
        } else {
            logger.error('fail, this mind map is not editable.');
            return;
        }
    }

    end_edit() {
        this.view.edit_node_end();
    }

    toggle_node(node) {
        if (!jm.util.is_node(node)) {
            return this.toggle_node(this.get_node(node));
        }
        if (!!node) {
            if (node.isroot) {return;}
            this.view.save_location(node);
            this.layout.toggle_node(node);
            this.view.relayout();
            this.view.restore_location(node);
        } else {
            logger.error('the node can not be found.');
        }
    }

    expand_node(node) {
        if (!jm.util.is_node(node)) {
            return this.expand_node(this.get_node(node));
        }
        if (!!node) {
            if (node.isroot) {return;}
            this.view.save_location(node);
            this.layout.expand_node(node);
            this.view.relayout();
            this.view.restore_location(node);
        } else {
            logger.error('the node can not be found.');
        }
    }

    collapse_node(node) {
        if (!jm.util.is_node(node)) {
            return this.collapse_node(this.get_node(node));
        }
        if (!!node) {
            if (node.isroot) {return;}
            this.view.save_location(node);
            this.layout.collapse_node(node);
            this.view.relayout();
            this.view.restore_location(node);
        } else {
            logger.error('the node can not be found.');
        }
    }

    expand_all() {
        this.layout.expand_all();
        this.view.relayout();
    }

    collapse_all() {
        this.layout.collapse_all();
        this.view.relayout();
    }

    expand_to_depth(depth) {
        this.layout.expand_to_depth(depth);
        this.view.relayout();
    }

    _reset() {
        this.view.reset();
        this.layout.reset();
        this.data.reset();
    }

    _show(mind) {
        const m = mind || jm.format.node_array.example;

        this.mind = this.data.load(m);
        if (!this.mind) {
            logger.error('data.load error');
            return;
        } else {
            logger.debug('data.load ok');
        }

        this.view.load();
        logger.debug('view.load ok');

        this.layout.layout();
        logger.debug('layout.layout ok');

        this.view.show(true);
        logger.debug('view.show ok');

        this.invoke_event_handle(jm.event_type.show, { data: [mind] });
    }

    show(mind) {
        this._reset();
        this._show(mind);
    }

    get_meta() {
        return {
            name: this.mind.name,
            author: this.mind.author,
            version: this.mind.version
        };
    }

    get_data(data_format) {
        const df = data_format || 'node_tree';
        return this.data.get_data(df);
    }

    get_root() {
        return this.mind.root;
    }

    get_node(nodeid) {
        return this.mind.get_node(nodeid);
    }

    add_node(parent_node, nodeid, topic, data) {
        console.log('2');
        if (this.get_editable()) {
            const node = this.mind.add_node(parent_node, nodeid, topic, data);
            console.log('4');
            if (!!node) {
                this.view.add_node(node);
                this.layout.layout();
                this.view.show(false);
                this.view.reset_node_custom_style(node);
                this.expand_node(parent_node);
                this.invoke_event_handle(jm.event_type.edit, {
                    evt: 'add_node',
                    data: [parent_node.id, nodeid, topic, data],
                    node: nodeid
                });
            }
            return node;
        } else {
            logger.error('fail, this mind map is not editable');
            return null;
        }
    }

    insert_node_before(node_before, nodeid, topic, data) {
        if (this.get_editable()) {
            const beforeid = jm.util.is_node(node_before) ? node_before.id : node_before;
            const node = this.mind.insert_node_before(node_before, nodeid, topic, data);
            if (!!node) {
                this.view.add_node(node);
                this.layout.layout();
                this.view.show(false);
                this.invoke_event_handle(jm.event_type.edit, {
                    evt: 'insert_node_before',
                    data: [beforeid, nodeid, topic, data],
                    node: nodeid
                });
            }
            return node;
        } else {
            logger.error('fail, this mind map is not editable');
            return null;
        }
    }

    insert_node_after(node_after, nodeid, topic, data) {
        if (this.get_editable()) {
            const node = this.mind.insert_node_after(node_after, nodeid, topic, data);
            if (!!node) {
                this.view.add_node(node);
                this.layout.layout();
                this.view.show(false);
                this.invoke_event_handle(jm.event_type.edit, {
                    evt: 'insert_node_after',
                    data: [node_after.id, nodeid, topic, data],
                    node: nodeid
                });
            }
            return node;
        } else {
            logger.error('fail, this mind map is not editable');
            return null;
        }
    }

    remove_node(node) {
        if (!jm.util.is_node(node)) {
            return this.remove_node(this.get_node(node));
        }
        if (this.get_editable()) {
            if (!!node) {
                if (node.isroot) {
                    logger.error('fail, can not remove root node');
                    return false;
                }
                const nodeid = node.id;
                const parentid = node.parent.id;
                const parent_node = this.get_node(parentid);
                this.view.save_location(parent_node);
                this.view.remove_node(node);
                this.mind.remove_node(node);
                this.layout.layout();
                this.view.show(false);
                this.view.restore_location(parent_node);
                this.invoke_event_handle(jm.event_type.edit, { evt: 'remove_node', data: [nodeid], node: parentid });
            } else {
                logger.error('fail, node can not be found');
                return false;
            }
        } else {
            logger.error('fail, this mind map is not editable');
            return;
        }
    }

    update_node(nodeid, topic, selected_type) {
        if (this.get_editable()) {
            if (jm.util.text.is_empty(topic)) {
                logger.warn('fail, topic can not be empty');
                return;
            }
            const node = this.get_node(nodeid);
            if (!!node) {
                if (node.topic === topic && node.selected_type === selected_type) {
                    logger.info('nothing changed');
                    this.view.update_node(node);
                    return;
                }
                node.topic = topic;
                node.selected_type = selected_type;
                this.view.update_node(node);
                this.layout.layout();
                this.view.show(false);
                this.invoke_event_handle(jm.event_type.edit, {
                    evt: 'update_node',
                    data: [nodeid, topic],
                    node: nodeid
                });
            }
        } else {
            logger.error('fail, this mind map is not editable');
            return;
        }
    }

    move_node(nodeid, beforeid, parentid, direction) {
        if (this.get_editable()) {
            const node = this.mind.move_node(nodeid, beforeid, parentid, direction);
            if (!!node) {
                this.view.update_node(node);
                this.layout.layout();
                this.view.show(false);
                this.invoke_event_handle(jm.event_type.edit, {
                    evt: 'move_node',
                    data: [nodeid, beforeid, parentid, direction],
                    node: nodeid
                });
            }
        } else {
            logger.error('fail, this mind map is not editable');
            return;
        }
    }

    select_node(node) {
        if (!jm.util.is_node(node)) {
            return this.select_node(this.get_node(node));
        }
        if (!node || !this.layout.is_visible(node)) {
            return;
        }
        this.mind.selected = node;
        if (!!node) {
            this.view.select_node(node);
        }
    }

    get_selected_node() {
        if (!!this.mind) {
            return this.mind.selected;
        } else {
            return null;
        }
    }

    select_clear() {
        if (!!this.mind) {
            this.mind.selected = null;
            this.view.select_clear();
        }
    }

    is_node_visible(node) {
        return this.layout.is_visible(node);
    }

    find_node_before(node) {
        if (!jm.util.is_node(node)) {
            return this.find_node_before(this.get_node(node));
        }
        if (!node || node.isroot) {return null;}
        let n = null;
        if (node.parent.isroot) {
            const c = node.parent.children;
            let prev = null;
            let ni = null;
            for (let i = 0; i < c.length; i++) {
                ni = c[i];
                if (node.direction === ni.direction) {
                    if (node.id === ni.id) {
                        n = prev;
                    }
                    prev = ni;
                }
            }
        } else {
            n = this.mind.get_node_before(node);
        }
        return n;
    }

    find_node_after(node) {
        if (!jm.util.is_node(node)) {
            return this.find_node_after(this.get_node(node));
        }
        if (!node || node.isroot) {return null;}
        let n = null;
        if (node.parent.isroot) {
            const c = node.parent.children;
            let getthis = false;
            let ni = null;
            for (let i = 0; i < c.length; i++) {
                ni = c[i];
                if (node.direction === ni.direction) {
                    if (getthis) {
                        n = ni;
                        break;
                    }
                    if (node.id === ni.id) {
                        getthis = true;
                    }
                }
            }
        } else {
            n = this.mind.get_node_after(node);
        }
        return n;
    }

    set_node_color(nodeid, bgcolor, fgcolor) {
        if (this.get_editable()) {
            const node = this.mind.get_node(nodeid);
            if (!!node) {
                if (!!bgcolor) {
                    node.data['background-color'] = bgcolor;
                }
                if (!!fgcolor) {
                    node.data['foreground-color'] = fgcolor;
                }
                this.view.reset_node_custom_style(node);
            }
        } else {
            logger.error('fail, this mind map is not editable');
            return null;
        }
    }

    set_node_font_style(nodeid, size, weight, style) {
        if (this.get_editable()) {
            const node = this.mind.get_node(nodeid);
            if (!!node) {
                if (!!size) {
                    node.data['font-size'] = size;
                }
                if (!!weight) {
                    node.data['font-weight'] = weight;
                }
                if (!!style) {
                    node.data['font-style'] = style;
                }
                this.view.reset_node_custom_style(node);
                this.view.update_node(node);
                this.layout.layout();
                this.view.show(false);
            }
        } else {
            logger.error('fail, this mind map is not editable');
            return null;
        }
    }

    set_node_background_image(nodeid, image, width, height, rotation) {
        if (this.get_editable()) {
            const node = this.mind.get_node(nodeid);
            if (!!node) {
                if (!!image) {
                    node.data['background-image'] = image;
                }
                if (!!width) {
                    node.data['width'] = width;
                }
                if (!!height) {
                    node.data['height'] = height;
                }
                if (!!rotation) {
                    node.data['background-rotation'] = rotation;
                }
                this.view.reset_node_custom_style(node);
                this.view.update_node(node);
                this.layout.layout();
                this.view.show(false);
            }
        } else {
            logger.error('fail, this mind map is not editable');
            return null;
        }
    }

    set_node_background_rotation(nodeid, rotation) {
        if (this.get_editable()) {
            const node = this.mind.get_node(nodeid);
            if (!!node) {
                if (!node.data['background-image']) {
                    logger.error('fail, only can change rotation angle of node with background image');
                    return null;
                }
                node.data['background-rotation'] = rotation;
                this.view.reset_node_custom_style(node);
                this.view.update_node(node);
                this.layout.layout();
                this.view.show(false);
            }
        } else {
            logger.error('fail, this mind map is not editable');
            return null;
        }
    }

    resize() {
        this.view.resize();
    }

    // callback(type ,data)
    add_event_listener(callback) {
        if (typeof callback === 'function') {
            this.event_handles.push(callback);
        }
    }

    invoke_event_handle(type, data) {
        const j = this;
        $w.setTimeout(function () {
            j._invoke_event_handle(type, data);
        }, 0);
    }

    _invoke_event_handle(type, data) {
        const l = this.event_handles.length;
        for (let i = 0; i < l; i++) {
            this.event_handles[i](type, data);
        }
    }

}

