"use strict";

/**
 * Provides `drag and drop` functionality
 *
 *
 * <i>Copyright (c) 2014 ITSA - https://github.com/itsa</i>
 * New BSD License - http://choosealicense.com/licenses/bsd-3-clause/
 *
 * @example
 * DD = require('drag-drop')(window);
 * DD.init();
 *
 * @module drag-drop
 * @class DD
 * @since 0.0.4
*/

var NAME = '[dragdrop]: ',
    DRAG = 'drag',
    DRAGGABLE = DRAG+'gable',
    DD_MINUS = 'dd-',
    DD_DRAGGING_CLASS = DD_MINUS+DRAG+'ging',
    DD_MASTER_CLASS = DD_MINUS+'master',
    DD_HANDLE = DD_MINUS+'handle',
    DD_COPIED_NODE = DD_MINUS+'copied-node',
    CONSTRAIN_ATTR = 'xy-constrain',
    PROXY = 'proxy',
    MOUSE = 'mouse',
    DATA_KEY = 'dragDrop',
    DD_EFFECT_ALLOWED = DD_EFFECT_ALLOWED,
    DROPZONE = 'dropzone',
    DD_DROPZONE = DD_MINUS+DROPZONE,
    NO_TRANS_CLASS = 'el-notrans', // delivered by `dom-ext`
    DD_HIDDEN_SOURCE_CLASS = DD_MINUS+'hidden-source',
    INVISIBLE_CLASS = 'el-invisible', // delivered by `dom-ext`
    DD_TRANSITION_CLASS = DD_MINUS+'transition',
    DD_OPACITY_CLASS = DD_MINUS+'opacity',
    HIGH_Z_CLASS = DD_MINUS+'high-z',
    DD_DROPACTIVE_CLASS = 'dropactive',
    REGEXP_MOVE = /\bmove\b/i,
    REGEXP_COPY = /\bcopy\b/i,
    REGEXP_NODE_ID = /^#\S+$/,
    REGEXP_ALL = /\b(all|true)\b/i,
    REGEXP_COPY = /\bcopy\b/i,
    EMITTER_NAME = 'emitter-name',
    REGEXP_EMITTER = /\bemitter-name=(\w+)\b/,
    DD_EMITTER_NAME = DD_MINUS+EMITTER_NAME,
    PX = 'px',
    COPY = 'copy',
    MOVE = 'move',
    DD_DRAG = DD_MINUS+DRAG,
    DD_OVER = DD_MINUS+'over',
    DD_OUT = DD_MINUS+'out',
    DD_DROP = DD_MINUS+'drop',
    UI_DD_START = 'UI:dd-start',
    DD_FAKE = DD_MINUS+'fake-',
    DOWN = 'down',
    UP = 'up',
    KEY = 'key',
    MOUSEUP = MOUSE+UP,
    MOUSEDOWN = MOUSE+DOWN,
    MOUSEMOVE = MOUSE+'move',
    DD_FAKE_MOUSEUP = DD_FAKE+MOUSEUP,
    DD_FAKE_MOUSEMOVE = DD_FAKE+MOUSEMOVE,
    UI = 'UI',
    DROPZONE_BRACKETS = '[' + DROPZONE + ']',
    DD_EFFECT_ALLOWED = DD_MINUS+'effect-allowed',
    BORDER = 'border',
    WIDTH = 'width',
    BORDER_LEFT_WIDTH = BORDER+'-left-'+WIDTH,
    BORDER_RIGHT_WIDTH = BORDER+'-right-'+WIDTH,
    BORDER_TOP_WIDTH = BORDER+'-top-'+WIDTH,
    BORDER_BOTTOM_WIDTH = BORDER+'-bottom-'+WIDTH,
    LEFT = 'left',
    TOP = 'top',
    WINDOW = 'window',
    POSITION = 'position',
    ABSOLUTE = 'absolute',
    TRANS_END = 'transitionend',
    LATER = require('utils').later;

require('polyfill/polyfill-base.js');
require('js-ext');
require('./css/drag-drop.css');

module.exports = function (window) {
    var Event = require('event-dom')(window),
        NodePlugin = require('dom-ext')(window).Plugins.NodePlugin,
        ctrlPressed = false,
        initialised = false,
        dropEffect = MOVE,
        DD, NodeDD, NodeDropzone;

    require('window-ext')(window);

    DD = {
       ddProps: {},
      /**
        * Returns the allowed effects on the dragable-HtmlElement. Is determined by the attribute `dd-effect-allowed`
        * Will be set to "move" when undefined.
        *
        * @method _allowedEffects
        * @param dragableElement {HtmlElement} HtmlElement that is checked for its allowed effects
        * @return {String} allowed effects: "move", "copy" or "all"
        * @private
        * @since 0.0.1
        */
        _allowedEffects: function(dragableElement) {
            console.log(NAME, '_allowedEffects');
            var allowedEffects = dragableElement.getAttr(DD_EFFECT_ALLOWED);
            return allowedEffects || MOVE;
        },

        /**
        * Default function for the `*:dd-drag`-event
        *
        * @method _defFnDrag
        * @param e {Object} eventobject
        * @private
        * @since 0.0.1
        */
        _defFnDrag: function(e) {
            console.log(NAME, '_defFnDrag: default function dd-drag');
            var ddProps = this.ddProps,
                dragNode = ddProps.dragNode,
                constrainNode = ddProps.constrainNode,
                winConstrained = ddProps.winConstrained,
                x, y;
            // is the drag is finished, there will be no ddProps.defined
            // return then, to prevent any events that stayed behind
            if (!ddProps.defined) {
                return;
            }

            // caution: the user might have put the mouse out of the screen and released the mousebutton!
            // If that is the case, the a mouseup-event should be initiated instead of draggin the element
            if (e.buttons===0) {
                // no more button pressed
                Event.emit(dragNode, DD_FAKE_MOUSEUP);
            }
            else {
                console.log(NAME, '_defFnDrag: dragging:');
                if (constrainNode) {
                    ddProps.constrain.x = ddProps.constrain.xOrig - constrainNode.getScrollLeft();
                    ddProps.constrain.y = ddProps.constrain.yOrig - constrainNode.getScrollTop();
                }

                x = ddProps.x+e.xMouse+(winConstrained ? ddProps.winScrollLeft : window.getScrollLeft())-e.xMouseOrigin;
                y = ddProps.y+e.yMouse+(winConstrained ? ddProps.winScrollTop : window.getScrollTop())-e.yMouseOrigin;

                dragNode.setXY(x, y, ddProps.constrain, true);

                ddProps.relatives && ddProps.relatives.forEach(
                    function(item) {
                        item.dragNode.setXY(x+item.shiftX, y+item.shiftY, null, true);
                    }
                );

                ddProps.winConstrained || dragNode.forceIntoView(true);
                constrainNode && dragNode.forceIntoNodeView(constrainNode);
            }
        },

        /**
         * Default function for the `*:dd-drop`-event
         *
         * @method _defFnDrag
         * @param e {Object} eventobject
         * @param sourceNode {HtmlElement} the original HtmlElement
         * @param dragNode {HtmlElement} the dragged HtmlElement (either original or clone)
         * @param dropzoneSpecified {Boolean} whether the sourceNode had a dropzone specified
         * @param x {Number} x-position in coordinaties relative to `document` (like getX())
         * @param y {Number} y-position in coordinaties relative to `document` (like getX())
         * @private
         * @since 0.0.1
         */
        _defFnDrop: function(e, sourceNode, dragNode, dropzoneSpecified, relatives) {
            console.log(NAME, '_defFnDrop: default function dd-drop. dropzoneSpecified: '+dropzoneSpecified);
            var instance = this,
                ddProps = instance.ddProps,
                willBeCopied,
                removeClasses = function (node) {
                    node.removeClass(NO_TRANS_CLASS).removeClass(HIGH_Z_CLASS).removeClass(DD_DRAGGING_CLASS);
                };

            willBeCopied =  (e.dropTarget && ((ctrlPressed && instance.allowCopy(dragNode)) || instance.onlyCopy(dragNode)));
            if (!willBeCopied) {
                e.copyTarget = null;
                e.relativeCopyNodes = null;
            }
            else {
                e.isCopied = true;
            }

            // handle drop
            if (dropzoneSpecified) {
                instance._handleDrop(e, sourceNode, dragNode, relatives);
            }
            else {
                removeClasses(dragNode);
                ddProps.relatives && ddProps.relatives.forEach(
                    function(item) {
                        removeClasses(item.dragNode);
                    }
                );
            }
            instance.restoreDraggables = function() {/* NOOP */};
        },

       /**
         * Default function for the `*:dd-over`-event
         *
         * @method _defFnOver
         * @param e {Object} eventobject
         * @private
         * @since 0.0.1
         */
        _defFnOver: function(e) {
            console.log(NAME, '_defFnOver: default function dd-over');
            var dropzone = e.target;
            dropzone.setClass(DD_DROPACTIVE_CLASS);
            e.over.then(
                function(insideDropTarget) {
                    dropzone.removeClass(DD_DROPACTIVE_CLASS);
                    insideDropTarget || e._noDDoutEvt || Event.emit(dropzone, e.emitterName+':'+DD_OUT, e);
                }
            );
        },

        /**
         * Default function for the `UI:dd-start`-event
         *
         * @method _defFnDrag
         * @param e {Object} eventobject
         * @private
         * @since 0.0.1
         */
        _defFnStart: function(e) {
            var instance = this,
                customEvent;
            e.emitterName = e.emitterName || e.target.getAttr(DD_EMITTER_NAME) || UI,
            customEvent = e.emitterName + ':'+DD_DRAG;
            console.log(NAME, '_defFnStart: default function UI:dd-start. Defining customEvent '+customEvent);
            Event.defineEvent(customEvent).defaultFn(instance._defFnDrag.bind(instance));
            instance._initializeDrag(e);
        },

      /**
        * Defines the definition of the `dd-start` event: the first phase of the drag-eventcycle (dd-start, *:dd-drag, *:dd-drop)
        *
        * @method _defineDDStart
        * @param e {Object} eventobject
        * @private
        * @since 0.0.1
        */
        _defineDDStart: function() {
            console.log(NAME, '_defineDDStart');
            var instance = this;
            // by using dd-start before dd-drag, the user can create a `before`-subscriber to dd-start
            // and define e.emitterName and/or e.relatives before going into `dd-drag`
            Event.defineEvent(UI_DD_START)
                .defaultFn(instance._defFnStart.bind(instance))
                .preventedFn(instance._prevFnStart.bind(instance));
        },

        /**
         * Defines the definition of the `dd-drop` event: the last phase of the drag-eventcycle (dd-start, *:dd-drag, *:dd-drop)
         *
         * @method _defineDropEv
         * @param e {Object} eventobject
         * @param sourceNode {HtmlElement} the original HtmlElement
         * @param dragNode {HtmlElement} the dragged HtmlElement (either original or clone)
         * @param dropzoneSpecified {Boolean} whether the sourceNode had a dropzone specified
         * @param x {Number} x-position in coordinaties relative to `document` (like getX())
         * @param y {Number} y-position in coordinaties relative to `document` (like getX())
         * @private
         * @since 0.0.1
         */
        _defineDropEv: function(e, emitterName, sourceNode, dragNode, dropzoneSpecified, x, y, inlineLeft, inlineTop, relatives) {
            console.log(NAME, '_defineDropEv '+dragNode);
            var instance = this;
            instance.restoreDraggables = instance._restoreDraggables.bind(instance, e, sourceNode, dragNode, dropzoneSpecified, x, y, inlineLeft, inlineTop, relatives);
            Event.defineEvent(emitterName+':'+DD_DROP)
                .defaultFn(instance._defFnDrop.rbind(instance, sourceNode, dragNode, dropzoneSpecified, relatives))
                .forceAssign(); // need to reassign, because all arguments need to be bound again
        },

        /**
         * Defines the definition of the `dd-over` event.
         * Also sets up listeners to tricker dd-over when the mouse is above an dropzone.
         *
         * @method _defineOverEv
         * @param e {Object} eventobject
         * @private
         * @since 0.0.1
         */
        _defineOverEv: function(e) {
            console.log(NAME, '_defineOverEv');
            var instance = this,
                emitterName = e.emitterName,
                ddProps = instance.ddProps,
                dropzones = window.document.getAll(DROPZONE_BRACKETS);
            if (dropzones.length>0) {
                Event.defineEvent(emitterName+':'+DD_OVER)
                     .defaultFn(instance._defFnOver.bind(instance)); // no need to reassign
                return Event.after([MOUSEMOVE, DD_FAKE_MOUSEMOVE], function(e2) {
                    var overDropzone = false;
                    ddProps.mouseOverNode = e.target;
                    dropzones.forEach(
                        function(dropzone) {
                            // don't do double:
                            if (dropzone === e.dropTarget) {
                                overDropzone = true;
                                return;
                            }
                            var dropzoneAccept = dropzone.getAttr(DROPZONE) || '',
                                dropzoneMove = REGEXP_MOVE.test(dropzoneAccept),
                                dropzoneCopy = REGEXP_COPY.test(dropzoneAccept),
                                dragOverPromise, dragOutEvent, effectAllowed, emitterAllowed, dropzoneEmitter, xMouseLast, yMouseLast;

                            if (e2.clientX) {
                                ddProps.xMouseLast = e2.clientX + window.getScrollLeft();
                                ddProps.yMouseLast = e2.clientY + window.getScrollTop();
                            }

                            // check if the mouse is inside the dropzone
                            // also check if the mouse is inside the dragged node: the dragged node might have been constrained
                            // and check if the dragged node is effectAllowed to go into the dropzone
                            xMouseLast = ddProps.xMouseLast;
                            yMouseLast = ddProps.yMouseLast;

                            if (dropzone.insidePos(xMouseLast, yMouseLast) && ddProps.dragNode.insidePos(xMouseLast, yMouseLast)) {
                                effectAllowed = (!dropzoneMove && !dropzoneCopy) || (dropzoneCopy && (dropEffect===COPY)) || (dropzoneMove && (dropEffect===MOVE));
                                dropzoneEmitter = instance.getDropzoneEmitter(dropzoneAccept);
                                emitterAllowed = !dropzoneEmitter || (dropzoneEmitter===emitterName);
                                if (effectAllowed && emitterAllowed) {
                                    overDropzone = true;
                                    e.dropTarget = dropzone;
                                    // mouse is in area of dropzone
                                    dragOverPromise = Promise.manage();
                                    e.over = dragOverPromise;
                                    dragOutEvent = Event.after(
                                        [MOUSEMOVE, DD_FAKE_MOUSEMOVE],
                                        function(e3) {
                                            dragOverPromise.fulfill(false);
                                        },
                                        function(e3) {
                                            var effectAllowed, dropzoneAccept, dropzoneMove, dropzoneCopy;
                                            if (e3.type===DD_FAKE_MOUSEMOVE) {
                                                dropzoneAccept = dropzone.getAttr(DROPZONE) || '';
                                                dropzoneMove = REGEXP_MOVE.test(dropzoneAccept);
                                                dropzoneCopy = REGEXP_COPY.test(dropzoneAccept);
                                                effectAllowed = (!dropzoneMove && !dropzoneCopy) || (dropzoneCopy && (dropEffect===COPY)) || (dropzoneMove && (dropEffect===MOVE));
                                                return !effectAllowed;
                                            }
                                            return !dropzone.insidePos((e3.clientX || e3.center.x)+window.getScrollLeft(), (e3.clientY || e3.center.y)+window.getScrollTop());
                                        }
                                    );
                                    dragOverPromise.finally(
                                        function(insideDropzone) {
                                            dragOutEvent.detach();
console.info('insideDropzone '+insideDropzone);
                                            insideDropzone || (e.dropTarget=null);
                                        }
                                    );
                                    ddProps.dragOverList.push(dragOverPromise);
                                    Event.emit(dropzone, emitterName+':'+DD_OVER, e);
                                }
                            }
                        }
                    );
                    overDropzone || (e.dropTarget=null);
                });
            }
        },

      /**
        * Sets the draggable node back to its original position
        *
        * @method _setBack
        * @param e {Object} eventobject
        * @param sourceNode {HtmlElement} the original HtmlElement
        * @param dragNode {HtmlElement} the dragged HtmlElement (either original or clone)
        * @param dropzoneSpecified {Boolean} whether the sourceNode had a dropzone specified
        * @param x {Number} x-position in coordinaties relative to `document` (like getX())
        * @param y {Number} y-position in coordinaties relative to `document` (like getX())
        * @private
        * @since 0.0.1
        */
        _handleDrop: function(e, sourceNode, dragNode, relatives) {
            console.log(NAME, '_handleDrop '+dragNode);
            var instance = this,
                dropzoneNode = e.dropTarget,
                constrainRectangle, borderLeft, borderTop, dragNodeX, dragNodeY, match, copyToDropzone, moveToDropzone, moveInsideDropzone;
            if (dropzoneNode) {
                copyToDropzone = function(nodeDrag, shiftX, shiftY) {
                    dropzoneNode.append(nodeDrag);
                    nodeDrag.removeClass(DD_OPACITY_CLASS).removeClass(DD_TRANSITION_CLASS).removeClass(HIGH_Z_CLASS).removeClass(DD_DRAGGING_CLASS);
                    nodeDrag.setXY(dragNodeX+shiftX, dragNodeY+shiftY, constrainRectangle);
                    // make the new HtmlElement non-copyable: it only can be replaced inside its dropzone
                    nodeDrag.setAttr(DD_EFFECT_ALLOWED, MOVE)
                            .setAttr(DD_COPIED_NODE, 'true'); // to make moving inside the dropzone possible without return to its startposition
                };
                moveToDropzone = function(nodeSource, nodeDrag, shiftX, shiftY) {
                    nodeSource.setInlineStyle(POSITION, ABSOLUTE);
                    dropzoneNode.append(nodeSource);
                    nodeSource.setXY(dragNodeX+shiftX, dragNodeY+shiftY, constrainRectangle);
                    nodeSource.removeClass(DD_HIDDEN_SOURCE_CLASS);
                    nodeDrag.remove();
                };
                // reset its position, only now constrain it to the dropzondenode
                // we need to specify exactly the droparea: because we don't want to compare to any
                // scrollWidth/scrollHeight, but exaclty to the visible part of the dropzone
                borderLeft = parseInt(dropzoneNode.getStyle(BORDER_LEFT_WIDTH), 10);
                borderTop = parseInt(dropzoneNode.getStyle(BORDER_TOP_WIDTH), 10);
                constrainRectangle = {
                    x: dropzoneNode.getX() + borderLeft,
                    y: dropzoneNode.getY() + borderTop,
                    w: dropzoneNode.offsetWidth - borderLeft - parseInt(dropzoneNode.getStyle(BORDER_RIGHT_WIDTH), 10),
                    h: dropzoneNode.offsetHeight - borderTop - parseInt(dropzoneNode.getStyle(BORDER_BOTTOM_WIDTH), 10)
                };
                if ((ctrlPressed && instance.allowCopy(dragNode)) || instance.onlyCopy(dragNode)) {
                    // backup x,y before move it into dropzone (which leads to new x,y)
                    dragNodeX = dragNode.getX();
                    dragNodeY = dragNode.getY();
                    // now move the dragNode into dropzone
                    copyToDropzone(dragNode, 0 ,0);
                    relatives && relatives.forEach(
                        function(item) {
                            copyToDropzone(item.dragNode, item.shiftX, item.shiftY);
                        }
                    );
                }
                else {
                    dragNodeX = dragNode.getX();
                    dragNodeY = dragNode.getY();
                    moveToDropzone(sourceNode, dragNode, 0, 0);
                    relatives && relatives.forEach(
                        function(item) {
                            moveToDropzone(item.sourceNode, item.dragNode, item.shiftX, item.shiftY);
                        }
                    );
                }
                Event.emit(e.copyTarget, e.emitterName+':'+DD_MINUS+DROPZONE, e);
            }
            else {
                if (dragNode.hasAttr(DD_COPIED_NODE)) {
                    moveInsideDropzone = function(hasMatch, nodeDrag, shiftX, shiftY) {
                        hasMatch && nodeDrag.setXY(dragNodeX+shiftX, dragNodeY+shiftY, constrainRectangle);
                        nodeDrag.removeClass(DD_OPACITY_CLASS).removeClass(DD_TRANSITION_CLASS).removeClass(HIGH_Z_CLASS).removeClass(DD_DRAGGING_CLASS);
                    };
                    // reset its position, only now constrain it to the dropzondenode
                    // we need to specify exactly the droparea: because we don't want to compare to any
                    // scrollWidth/scrollHeight, but exaclty to the visible part of the dropzone
                    match = false;
                    dropzoneNode = dragNode.parentNode;
                    while (dropzoneNode.matchesSelector && !match) {
                        match = dropzoneNode.matchesSelector(DROPZONE_BRACKETS);
                        // if there is a match, then make sure x and y fall within the region
                        match || (dropzoneNode=dropzoneNode.parentNode);
                    }
                    if (match) {
                        borderLeft = parseInt(dropzoneNode.getStyle(BORDER_LEFT_WIDTH), 10);
                        borderTop = parseInt(dropzoneNode.getStyle(BORDER_TOP_WIDTH), 10);
                        constrainRectangle = {
                            x: dropzoneNode.getX() + borderLeft,
                            y: dropzoneNode.getY() + borderTop,
                            w: dropzoneNode.offsetWidth - borderLeft - parseInt(dropzoneNode.getStyle(BORDER_RIGHT_WIDTH), 10),
                            h: dropzoneNode.offsetHeight - borderTop - parseInt(dropzoneNode.getStyle(BORDER_BOTTOM_WIDTH), 10)
                        };
                        dragNodeX = dragNode.getX();
                        dragNodeY = dragNode.getY();
                    }
                    moveInsideDropzone(match, dragNode, 0, 0);
                    relatives && relatives.forEach(
                        function(item) {
                            moveInsideDropzone(match, item.dragNode, item.shiftX, item.shiftY);
                        }
                    );
                }
                else {
                    instance.restoreDraggables();
                }
            }
            sourceNode.removeClass(DD_MASTER_CLASS);
            dragNode.removeClass(DD_MASTER_CLASS);
        },

restoreDraggables: function() {/* NOOP */},

_restoreDraggables: function(e, sourceNode, dragNode, dropzoneSpecified, x, y, inlineLeft, inlineTop, relatives) {
    console.log('_restoreDraggables');
    var instance = this;
    instance.restoreDraggables = function() {/* NOOP */};
    instance._setBack(e, sourceNode, dragNode, dropzoneSpecified, x, y, inlineLeft, inlineTop, true);
    relatives && relatives.forEach(
        function(item) {
            instance._setBack(e, item.sourceNode, item.dragNode, dropzoneSpecified, x+item.shiftX, y+item.shiftY, item.inlineLeft, item.inlineTop);
        }
    );
},
       /**
         * Default function for the `*:dd-drag`-event
         *
         * @method _initializeDrag
         * @param e {Object} eventobject
         * @private
         * @since 0.0.1
         */
        _initializeDrag: function(e) {
            console.log(NAME, '_initializeDrag '+e.xMouseOrigin);
            var instance = this,
                sourceNode = e.target,
                constrain = sourceNode.getAttr(CONSTRAIN_ATTR),
                ddProps = instance.ddProps,
                emitterName = e.emitterName,
                dropzoneSpecified = sourceNode.hasAttr(DD_DROPZONE) || (emitterName!==UI),
                moveEv, dragNode, x, y, byExactId, match, constrainNode, winConstrained, winScrollLeft, winScrollTop,
                inlineLeft, inlineTop, xOrig, yOrig, setupDragnode;

            setupDragnode = function(nodeSource, nodeDrag, shiftX, shiftY) {
                (dropEffect===COPY) ? nodeDrag.setClass(DD_OPACITY_CLASS) : nodeSource.setClass(DD_HIDDEN_SOURCE_CLASS);
                nodeDrag.setClass(INVISIBLE_CLASS);

                nodeDrag.setInlineStyle(POSITION, ABSOLUTE);
                nodeSource.parentNode.append(nodeDrag, nodeSource);

                nodeDrag.setXY(ddProps.xMouseLast+shiftX, ddProps.yMouseLast+shiftY, ddProps.constrain, true);
                nodeDrag.removeClass(INVISIBLE_CLASS);
            };
            // define ddProps --> internal object with data about the draggable instance
            ddProps.sourceNode = sourceNode;
            ddProps.dragNode = dragNode = dropzoneSpecified ? sourceNode.clone(true) : sourceNode;
            ddProps.x = x = sourceNode.getX();
            ddProps.y = y = sourceNode.getY();
            ddProps.inlineLeft = inlineLeft = sourceNode.getInlineStyle(LEFT);
            ddProps.inlineTop = inlineTop = sourceNode.getInlineStyle(TOP);
            ddProps.dropzoneSpecified = dropzoneSpecified;
            ddProps.winConstrained = winConstrained = (constrain===WINDOW);
            ddProps.xMouseLast = x;
            ddProps.yMouseLast = y;

            e.dragTarget = sourceNode; // equals e.target, but the event dd-drop-zone has e.target set to dragNode, which might be a copy
            e.copyTarget = dragNode;

            if (constrain) {
                if (ddProps.winConstrained) {
                    ddProps.winScrollLeft = winScrollLeft = window.getScrollLeft();
                    ddProps.winScrollTop = winScrollTop = window.getScrollTop();
                    ddProps.constrain = {
                        x: winScrollLeft,
                        y: winScrollTop,
                        w: window.getWidth(),
                        h: window.getHeight()
                    };
                }
                else {
                    byExactId = REGEXP_NODE_ID.test(constrain);
                    constrainNode = sourceNode.parentNode;
                    while (constrainNode.matchesSelector && !match) {
                        match = byExactId ? (constrainNode.id===constrain.substr(1)) : constrainNode.matchesSelector(constrain);
                        // if there is a match, then make sure x and y fall within the region
                        if (match) {
                            ddProps.constrainNode = constrainNode;
                            xOrig = constrainNode.getX() + parseInt(constrainNode.getStyle(BORDER_LEFT_WIDTH), 10);
                            yOrig = constrainNode.getY() + parseInt(constrainNode.getStyle(BORDER_TOP_WIDTH), 10);
                            ddProps.constrain = {
                                xOrig: xOrig,
                                yOrig: yOrig,
                                x: xOrig - constrainNode.getScrollLeft(),
                                y: yOrig - constrainNode.getScrollTop(),
                                w: constrainNode.scrollWidth,
                                h: constrainNode.scrollHeight
                            };
                        }
                        else {
                            constrainNode = constrainNode.parentNode;
                        }
                    }
                }
            }

            // create listener for `mousemove` and transform it into the `*:dd:drag`-event
            moveEv = Event.after(MOUSE+MOVE, function(e2) {
                if (!e2.clientX) {
                    return;
                }
                // move the object
                e.xMouse = e2.clientX;
                e.yMouse = e2.clientY;
                Event.emit(sourceNode, emitterName+':'+DD_DRAG, e);
                e.dd.callback();
            });

            // prepare dragNode class for the right CSS:
            dragNode.setClass(NO_TRANS_CLASS)
                    .setClass(HIGH_Z_CLASS)
                    .setClass(DD_DRAGGING_CLASS);

            Event.onceAfter([MOUSE+UP, DD_FAKE_MOUSEUP], function(e3) {
                moveEv.detach();
                instance._teardownOverEvent(e, e3.clientX, e3.clientY);
                instance.ddProps = {};
                Event.emit(sourceNode, emitterName+':'+DD_DROP, e);
                e.dd.fulfill();
            });

            if (dropzoneSpecified) {
                dropEffect = (instance.onlyCopy(sourceNode) || (ctrlPressed && instance.allowCopy(sourceNode))) ? COPY : MOVE;
                setupDragnode(sourceNode, dragNode, 0, 0);
            }
            else {
                dropEffect = null;
                dragNode.setXY(ddProps.xMouseLast, ddProps.yMouseLast, ddProps.constrain, true);
            }

            if (e.relatives) {
                // relatives are extra HtmlElements that should be moved aside with the main dragged element
                // e.relatives is a selector, e.relativeNodes will be an array with nodes
                e.relativeNodes = [];
                e.relativeCopyNodes = [];
                sourceNode.setClass(DD_MASTER_CLASS);
                dragNode.setClass(DD_MASTER_CLASS);
                ddProps.relatives = [];
                e.relatives.forEach(
                    function(node) {
                        var item;
                        if (node !== sourceNode) {
                            item = {
                                sourceNode: node,
                                dragNode: dropzoneSpecified ? node.clone(true) : node,
                                shiftX: node.getX() - x,
                                shiftY: node.getY() - y,
                                inlineLeft: node.getInlineStyle(LEFT),
                                inlineTop: node.getInlineStyle(TOP)
                            };
                            item.dragNode.setClass(NO_TRANS_CLASS)
                                         .setClass(HIGH_Z_CLASS)
                                         .setClass(DD_DRAGGING_CLASS);
                            dropzoneSpecified && setupDragnode(item.sourceNode, item.dragNode, item.shiftX, item.shiftY);
                            ddProps.relatives.push(item);
                            e.relativeNodes.push(item.sourceNode);
                            e.relativeCopyNodes.push(item.dragNode);
                        }
                    }
                );
            }

            // create a custom over-event that fires exactly when the mouse is over any dropzone
            // we cannot use `hover`, because that event fails when there is an absolute floated element outsize `dropzone`
            // lying on top of the dropzone. -> we need to check by coördinates
            instance.ddProps.dragOverEv = instance._defineOverEv(e);

            instance.ddProps.dragDropEv = instance._defineDropEv(e, emitterName, sourceNode, dragNode, dropzoneSpecified, x, y, inlineLeft, inlineTop, ddProps.relatives);
        },

        /**
         * Prevented function for the `*:dd-start`-event
         *
         * @method _prevFnStart
         * @param e {Object} eventobject
         * @private
         * @since 0.0.1
         */
        _prevFnStart: function(e) {
            console.log(NAME, '_prevFnStart');
            e.dd.reject();
        },

      /**
        * Sets the draggable node back to its original position
        *
        * @method _setBack
        * @param sourceNode {HtmlElement} the original HtmlElement
        * @param dragNode {HtmlElement} the dragged HtmlElement (either original or clone)
        * @param dropzoneSpecified {Boolean} whether the sourceNode had a dropzone specified
        * @param x {Number} x-position in coordinaties relative to `document` (like getX())
        * @param y {Number} y-position in coordinaties relative to `document` (like getX())
        * @private
        * @since 0.0.1
        */
        _setBack: function(e, sourceNode, dragNode, dropzoneSpecified, x, y, inlineLeft, inlineTop, emitDDout) {
            console.log(NAME, '_setBack to '+x+', '+y);
            var tearedDown,
                winScrollTop,
                winScrollLeft,
                dropzones,
                tearDown = function(notransRemoval) {
                    // dragNode might be gone when this method is called for the second time
                    // therefor check its existance:
                    if (!tearedDown) {
                        tearedDown = true;
                        notransRemoval || (dragNode.removeEventListener && dragNode.removeEventListener(TRANS_END, tearDown, true));
                        if (dropzoneSpecified) {
                            sourceNode.removeClass(DD_HIDDEN_SOURCE_CLASS);
                            dragNode.remove();
                        }
                        else {
                            dragNode.removeClass(DD_TRANSITION_CLASS).removeClass(HIGH_Z_CLASS).removeClass(DD_DRAGGING_CLASS);
                            dragNode.setInlineStyle(LEFT, inlineLeft);
                            dragNode.setInlineStyle(TOP, inlineTop);
                        }
                    }
                };
            dragNode.removeClass(NO_TRANS_CLASS);

            dragNode.removeClass(DD_DRAGGING_CLASS);
            dragNode.setClass(DD_TRANSITION_CLASS);
            // transitions only work with IE10+, and that browser has addEventListener
            // when it doesn't have, it doesn;t harm to leave the transitionclass on: it would work anyway
            // nevertheless we will remove it with a timeout
            if (dragNode.addEventListener) {
                dragNode.addEventListener(TRANS_END, tearDown, true);
            }
            // ALWAYS tearDowm after delay --> when there was no repositioning, there never will be a transition-event
            LATER(tearDown, 260);
            dragNode.setXY(x, y);
            // now we might need to fire a last `dd-over` event when the dragged element returns to a dropzone when it wasn't before set it back
            if (emitDDout) {
                dropzones = window.document.getAll(DROPZONE_BRACKETS);
                if (dropzones) {
                    winScrollTop = window.getScrollTop();
                    winScrollLeft = window.getScrollLeft();
                    dropzones.forEach(
                        function(dropzone) {
                            if (dropzone.insidePos(x, y) && !dropzone.insidePos(e.xMouse+winScrollLeft, e.yMouse+winScrollTop)) {
                                e.dropTarget = dropzone;
                                e._noDDoutEvt = true;
                                Event.emit(dropzone, e.emitterName+':'+DD_OVER, e);
                            }
                        }
                    );
                }
            }
        },

      /**
        * Sets up a `keydown` and `keyup` listener, to monitor whether a `ctrlKey` (windows) or `metaKey` (Mac)
        * is pressed to support the copying of draggable items
        *
        * @method _setupKeyEv
        * @private
        * @since 0.0.1
        */
        _setupKeyEv: function() {
            console.log(NAME, '_setupKeyEv');
            var instance = this,
                changeClasses = function(sourceNode, dragNode) {
                    if (ctrlPressed) {
                        sourceNode.removeClass(DD_HIDDEN_SOURCE_CLASS);
                        dragNode.setClass(DD_OPACITY_CLASS);
                    }
                    else {
                        sourceNode.setClass(DD_HIDDEN_SOURCE_CLASS);
                        dragNode.removeClass(DD_OPACITY_CLASS);
                    }
                };
            Event.after([KEY+DOWN, KEY+UP], function(e) {
                console.log(NAME, 'event '+e.type);
                var ddProps = instance.ddProps,
                    sourceNode = ddProps.sourceNode,
                    dragNode, mouseOverNode;
                ctrlPressed = e.ctrlKey || e.metaKey;
                if (sourceNode && instance.allowSwitch(sourceNode)) {
                    dragNode = ddProps.dragNode;
                    mouseOverNode = ddProps.mouseOverNode;
                    dropEffect = ctrlPressed ? COPY : MOVE;
                    changeClasses(sourceNode, dragNode);
                    ddProps.relatives && ddProps.relatives.forEach(
                        function(item) {
                            changeClasses(item.sourceNode, item.dragNode);
                        }
                    );
                    // now, it could be that any droptarget should change its appearance (DD_DROPACTIVE_CLASS).
                    // we need to recalculate it for all targets
                    // we do this by emitting a DD_FAKE_MOUSEMOVE event
                    mouseOverNode && Event.emit(mouseOverNode, UI+':'+DD_FAKE_MOUSEMOVE);
                }
            });
        },

      /**
        * Engine behinf the dragdrop-cycle.
        * Sets up a `mousedown` listener to initiate a drag-drop eventcycle. The eventcycle start whenever
        * one of these events happens on a HtmlElement with the attribute `dd-draggable="true"`.
        * The drag-drop eventcycle consists of the events: `dd-start`, `emitterName:dd-drag` and `emitterName:dd-drop`
        *
        *
        * @method _setupMouseEv
        * @private
        * @since 0.0.1
        */
        _setupMouseEv: function() {
            var instance = this;
            console.log(NAME, '_setupMouseEv: setting up mousedown event');
            Event.after(MOUSEDOWN, function(e) {
                var node = e.target,
                    handle, availableHandles, insideHandle;

                // first check if there is a handle to determine if the drag started here:
                handle = node.getAttr(DD_HANDLE);
                if (handle) {
                    availableHandles = node.getAll(handle);
                    insideHandle = false;
                    availableHandles.some(function(handleNode) {
                        insideHandle = handleNode.contains(e.sourceTarget);
                        return insideHandle;
                    });
                    if (!insideHandle) {
                        return;
                    }
                }

                // initialize ddProps: have to do here, because the event might not start because it wasn't inside the handle when it should be
                instance.ddProps = {
                    defined: true,
                    dragOverList: []
                };

                // prevent the emitter from resetting e.target to e.sourceTarget:
                e._noResetSourceTarget = true;
                // add `dd`-Promise to the eventobject --> this Promise will be resolved once the pointer has released.
                e.dd = Promise.manage();
                // define e.setOnDrag --> users
                e.setOnDrag = function(callbackFn) {
                    e.dd.setCallback(callbackFn);
                };
                // store the orriginal mouseposition:
                e.xMouseOrigin = e.clientX + window.getScrollLeft();
                e.yMouseOrigin = e.clientY + window.getScrollTop();
                // now we can start the eventcycle by emitting UI:dd-start:
                Event.emit(e.target, UI_DD_START, e);
            }, '['+DD_MINUS+DRAGGABLE+'="true"]');

        },

      /**
        * Cleansup the dragover subscriber and fulfills any dropzone-promise.
        *
        * @method _teardownOverEvent
        * @param e {Object} eventobject
        * @param mouseX {Number} last x-pos of the mouse
        * @param mouseY {Number} last y-pos of the mouse
        * @private
        * @since 0.0.1
        */
        _teardownOverEvent: function(e, mouseX, mouseY) {
            console.log('_teardownOverEvent');
            var ddProps = this.ddProps,
                dragOverEvent = ddProps.dragOverEv,
                winScrollTop, winScrollLeft;
            if (dragOverEvent) {
                dragOverEvent.detach();
                winScrollTop = window.getScrollTop();
                winScrollLeft = window.getScrollLeft();
                ddProps.dragOverList.forEach(function(promise) {
                    promise.fulfill(e.dropTarget && e.dropTarget.insidePos(mouseX+winScrollLeft, mouseY+winScrollTop));
                });
            }
        },

       /**
         * Returns true if the dropzone-HtmlElement accepts copy-dragables.
         * Is determined by the attribute `dd-effect-allowed="copy"` or `dd-effect-allowed="all"`
         *
         * @method allowCopy
         * @param dropzone {HtmlElement} HtmlElement that is checked for its allowed effects
         * @return {Boolean} if copy-dragables are allowed
         * @since 0.0.1
         */
        allowCopy: function(dropzone) {
            var allowedEffects = this._allowedEffects(dropzone);
            console.log('allowCopy --> '+REGEXP_ALL.test(allowedEffects) || REGEXP_COPY.test(allowedEffects));
            return REGEXP_ALL.test(allowedEffects) || REGEXP_COPY.test(allowedEffects);
        },

       /**
         * Returns true if the dragable-HtmlElement allowes to switch between `copy` and `move`.
         *
         * @method allowSwitch
         * @param dragableElement {HtmlElement} HtmlElement that is checked for its allowed effects
         * @return {Boolean} if copy-dragables are allowed
         * @since 0.0.1
         */
        allowSwitch: function(dragableElement) {
            console.log('allowSwitch --> '+REGEXP_ALL.test(this._allowedEffects(dragableElement)));
            return REGEXP_ALL.test(this._allowedEffects(dragableElement));
        },

       /**
         * Returns the emitterName that the dropzone accepts.
         *
         * @method getDropzoneEmitter
         * @param dropzone {String} dropzone attribute of the dropzone HtmlElement
         * @return {String|null} the emitterName that is accepted
         * @since 0.0.1
         */
        getDropzoneEmitter: function(dropzone) {
            var extract = dropzone.match(REGEXP_EMITTER);
            console.log('getDropzoneEmitter --> '+(extract && extract[1]));
            return extract && extract[1];
        },

       /**
         * Initializes dragdrop. Needs to be invoked, otherwise DD won't run.
         *
         * @method init
         * @param dragableElement {HtmlElement} HtmlElement that is checked for its allowed effects
         * @return {Boolean} if copy-dragables are allowed
         * @since 0.0.1
         */
        init: function() {
            console.log(NAME, 'init');
            var instance = this;
            if (!instance.initialised) {
                instance._setupKeyEv();
                instance._defineDDStart();
                instance._setupMouseEv(); // engine behind the dragdrop-eventcycle
            }
            instance.initialised = true;
        },

       /**
         * Returns true if the dragable-HtmlElement accepts only copy-dragables (no moveable)
         * Is determined by the attribute `dd-effect-allowed="copy"`
         *
         * @method onlyCopy
         * @param dragableElement {HtmlElement} HtmlElement that is checked for its allowed effects
         * @return {Boolean} if only copy-dragables are allowed
         * @since 0.0.1
         */
        onlyCopy: function(dragableElement) {
            console.log('onlyCopy --> '+REGEXP_COPY.test(this._allowedEffects(dragableElement)));
            return REGEXP_COPY.test(this._allowedEffects(dragableElement));
        }
    };

    NodeDD = NodePlugin.subClass(
        function (config) {
            config || (config={});
            this[DD_MINUS+DRAGGABLE] = true;
            this[DD_MINUS+DROPZONE] = config.dropzone;
            this[CONSTRAIN_ATTR] = config.constrain;
            this[DD_EMITTER_NAME] = config.emitterName;
            this[DD_HANDLE] = config.handle;
            this[DD_EFFECT_ALLOWED] = config.effectAllowed;
        }
    );

    NodeDropzone = NodePlugin.subClass(
        function (config) {
            var dropzone = 'true',
                emitterName;
            config || (config={});
            if (config.copy && !config.move) {
                dropzone = COPY;
            }
            else if (!config.copy && config.move) {
                dropzone = MOVE;
            }
            (emitterName=config.emitterName) && (dropzone+=' '+EMITTER_NAME+'='+emitterName);
            this.dropzone = dropzone;
        }
    );

    return {
        DD: DD,
        Plugins: {
            NodeDD: NodeDD,
            NodeDropzone: NodeDropzone
        }
    };
};