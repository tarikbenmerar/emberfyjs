//TODO: Avoid binding duplications
//TODO: Action management
//TODO: A function should be rendered as a function
//TODO: @each property management, observer
//TODO: each element, and block super class

Emberfy = {
    triggerObservers : function (obj, attr) {
        if(obj.observers && obj.observers[attr]) {
            var attr_observers = obj.observers[attr];
            for(i in attr_observers) {
                //Set the attribute on the observer
                var observer = attr_observers[i];
                var obj_obs  = observer[0];
                var attr_obs  = observer[1];
                var attr_obj_ref = observer[2];

                Emberfy.set(obj_obs, attr_obs, obj[attr], attr_obj_ref);
            }
        }
    },

    addObserver : function ( obj, obs, attr_obj, attr_obs, attr_obj_ref ) {
 
        if(typeof obj == "number" || typeof obj == "string" || obj == undefined || 
           typeof obs == "number" || typeof obs == "string" || obs == undefined)
            return;

        if(!obj.observers)
            obj.observers = {};

        if(!obj.observers[attr_obj])
            obj.observers[attr_obj] = [];
        obj.observers[attr_obj].push([obs, attr_obs, attr_obj_ref]);

        //TODO: Solve duplications
        if(!obs.observing)
            obs.observing = [];
        obs.observing.push(obj);
    },

    //TODO:Improve Performance
    removeObserver : function (obj, observer) {
      if(obj && obj.observers) {
          for(i in obj.observers) {
              var obs = obj.observers[i];
              if(observer === obs['obj']) {
                  delete obj.observers[i];
              }
          }
      }
    },

    stopObserving : function (obj) {
         if(obj.observing) {
             for(i in obj.observing) {
                 if(!Object.prototype.hasOwnProperty.call(obj.observering, i))
                     continue;
                 Emberfy.removeObserver(obj.observing[i], obj);
                 obj.observing[i].removeObserver(obj);
             }
         }
    }, 

    //Build the property chain to be observed
    buildPropChain : function (obj, attr) {
        var node, property, old_ref, ref, 
            property_chain = attr.split("."), 
            property_root;

        //Build Chain binding if it doesn't exist
        if(!obj.chain_bind) {
            obj.chain_bind = {};
        }

        property = property_chain.shift();
        property_root = property;
        obj.chain_bind[property] = obj.chain_bind[property] || {nodes:{}};
        node = obj.chain_bind[property];
        ref = Emberfy.get(obj, property);

        while(property_chain.length != 0) {
            //Move to the next property
            property = property_chain.shift();
            property_root += "." + property;

            //Save the old reference, and retrieve the new one
            old_ref = ref;
            ref = Emberfy.get(obj, property_root);

            //If the node has not been created already
            if(node.nodes[property] == undefined) {
                //Create node
                node.nodes[property] = {nodes : {}, 
                                        ref : ref};

                if(old_ref) {
                    //Start observing the property
                    Emberfy.addObserver(old_ref, 
                                        obj,
                                        property, 
                                        "___junk", 
                                        property_root);
                }
               
            }

            //Continue diving indepth into the chain
            node = node.nodes[property];
        }
    },

    //Rebuild the property chain to be observed
    rebuildPropChain : function (obj, attr) {
        var property, ref, property_root, 
            property_chain = attr.split(".");

        //Retrieve the first property
        property = property_chain.shift();
        property_root = property;


        //If the property chain doesn't exist
        if(!obj.chain_bind || !obj.chain_bind[property])
            return;

        node = obj.chain_bind[property];
        ref = Emberfy.get(obj, property);

        //Get to the property chain
        while(property_chain.length != 0 && node) {
             property = property_chain.shift();
             ref = Emberfy.get(obj, property_root);
             property_root += "." + property;
             node = node.nodes[property];
        }

        if(node) {
            //Rebuild all the nodes from this chain underneath
            Emberfy.rebuildPropChainNode(obj, property_root, property,
                                         ref, node);
        }
        //Notify the object the property chain has been built
        if(obj.propChainRebuilt){
            obj.propChainRebuilt(attr);
        }
    },

    rebuildPropChainNode : function (obj, property_root, property,
                                     ref, node) {

        var new_ref = Emberfy.get(obj, property_root);

        //Update observing for non root properties
        if(property_root.indexOf(".") != 1) {
                //Remove observing
                Emberfy.removeObserver(node.ref, obj);

                //Add a new observer for the new reference
                Emberfy.addObserver(ref, 
                                    obj,
                                    property, 
                                    "___junk", 
                                    property_root);

            //Update the reference
            node.ref = new_ref;
        }
 
        //Rebuild nodes underneath
        for(i in node.nodes) {
            Emberfy.rebuildPropChainNode(obj, property_root + "." + i, i, 
                                         new_ref, node.nodes[i]);        
        }

        //Notify the object that the property chain node has been built
        if(obj.propChainNodeBuilt) {
            obj.propChainNodeBuilt(property_root);
        }
    },

    set : function (obj, attr, val, attr_obj_ref) {
        if(obj.setAttr) {
            return obj.setAttr(attr, val, attr_obj_ref);
        } else {
            return Emberfy.setAttr(obj, attr, val);
        }
    },

    //Set the value of the object attribute.
    setAttr : function (obj, attr, val) {
        var property_split, property_chain;
        //Set only if the current value changes
        if (Emberfy.get(obj, attr) != val) {
            try {
                Function("arguments[0]." + attr + " = arguments[1];")(obj, val);
            } catch(e) {
                //TODO: Specific exception management
            }
            Emberfy.rebuildPropChain(obj, attr);
            Emberfy.triggerObservers(obj, attr);
        }
    },

    get : function (obj, attr) {
        if(obj.getAttr) {
            return obj.getAttr(attr);
        } else {
            return Emberfy.getAttr(obj, attr);
        }
    },

    //Get the value of the object attribute.
    getAttr : function (obj, attr) {
        try {
            var val = Function("return arguments[0]." + attr)(obj);
            if(val instanceof Emberfy.ComputedProperty) {
                return val.callComputed();
            } else {
                return val;
            }
        } catch (e) {
            //TODO: specific exception management
            return undefined;
        }
    },

    

    extend : function (base_class, proto) {
         var constructor = function () {
             //Initialize the class
             if(this.init) {
                 this.init.apply(this, arguments);
             }
             this.observers = {};
             this.observing = [];
         }

         for (e in base_class.prototype) {
              constructor.prototype[e] = base_class.prototype[e];
         }

         for (e in proto) {
              constructor.prototype[e] = proto[e];
         }

         constructor.prototype._super = function () {
              var init = base_class.prototype["init"];
              if(init) {
                  init.apply(this, arguments);
              }  
          }

          constructor.extend = function (proto) {
              return Emberfy.extend(constructor, proto);
          }

          return constructor;
    } 
};

Emberfy.BaseObject = Emberfy.extend(Object, {

    init : function () {

        //Initializing property chain binding
        this.chain_bind = {};

        //Set the computed properties   
        var computed, property, property_split;
        this._computed_properties = {};
        for(i in this) {
            if(this[i] instanceof Emberfy.ComputedProperty) {
                computed = this[i];
                computed.setContext(this);
                this._computed_properties[i] = computed;

                //Build the property chain for each property 
                for(j=0; j < computed.properties.length;j++) {
                    this.buildPropChain(computed.properties[j]);
                }
            }
        }
    },

    set : function (attr, val, attr_obj_ref) {
        return Emberfy.set(this, attr, val, attr_obj_ref);
    },

    get : function (attr) {
        return Emberfy.get(this, attr);
    },

    setAttr : function (attr, val) {
        return Emberfy.setAttr(this, attr, val);
    },

    getAttr : function (attr) {
        return Emberfy.getAttr(this, attr);
    },

    triggerObservers : function (attr) {
        return Emberfy.triggerObservers(this, attr);
    },

    addObserver : function (obj, attr, obj_attr) {
        return Emberfy.addObserver(this, obj, attr, obj_attr);
    },

    buildPropChain : function (attr) {
        return Emberfy.buildPropChain(this, attr);
    },

    rebuildPropChain : function (attr) {
        return Emberfy.rebuildPropChain(this, attr);
    },

    //TODO: with specific attribute ?????
    removeOberserver : function (target) {
        return Emberfy.removeObserver(this, target);
    },
    
    stopObserving : function () {
        return Emberfy.stopObserving(this);
    }
});


Emberfy.A = Emberfy.extend(Array, {
    addObject : function (obj) {
        this.push(obj);
        Emberfy.triggerObservers(this, "addObject", obj);
        Emberfy.triggerObservers(this, "@each", obj);
    },

    //TODO: Complete the implementation
    removeObject : function (obj) {
        Emberfy.triggerObservers(this, "removeObject", obj);
        Emberfy.triggerObservers(this, "@each", obj);
    }
});

Emberfy.BaseView = Emberfy.BaseObject.extend({

    //Supported DOM Event names
    domEvents : ["touchStart", "touchMove", "touchEnd", "touchCancel", "keyDown", "keyUp",
                 "keyPress", "mouseDown", "mouseUp", "contextMenu", "click", "doubleClick",
                 "mouseMove", "focuseIn", "focusOut", "mouseEnter", "mouseLeave", "submit", 
                 "change", "dragStart", "drag", "dragEnter", "dragLeave", "dragOver", "drop",
                 "dragEnd"],

    init : function (parent, $el) {
    
        Emberfy.BaseObject.prototype.init.call(this);

        //The parent object to propogate events
        this.parent = parent; 

        //The attached view element
        this.$el = $el;

        //The view endpoints related to attributes
        this.view_endpoints = {};

        //The html endpoints related to attributes
        this.html_endpoints = {};
        
        //The attributes bindings
        this.attr_bind = {};

        //The class names bindings
        this.cls_bind = {};

        //The variable bindings
        this.var_bind = {};

        //The condition bindings
        this.cond_bind = {};

        //DOM Events bindings
        this.dom_bind = {};
    },
    
    setAttr : function (attr, val, obj_attr_ref) {
        //Call the super class method
        Emberfy.BaseObject.prototype.setAttr.call(this, attr, val);

        //Update the attribute in the view
        this.rebuildPropChain(attr);

        //Update from extenal observer triggering
        if(obj_attr_ref) {
            this.rebuildPropChain(obj_attr_ref);
        }
    },

    //What to do when the property chain has been set
    propChainRebuilt : function (attr) {
        //Propagate the chain rebuilding to endpoints
        this.propagateChainRebuilt(attr);
    },

    //What to do when the property chain node is built or rebuilt
    propChainNodeBuilt : function (attr) {
        this.updateAttrView(attr);
    },

    updateAttrView : function (attr) {
        //Update attribute binding
        this.updateBindAttr(attr);

        //Update class binding
        this.updateBindClasses(attr);

        //Update variable bindings
        this.updateBindVar(attr);

        //Update condition bindings
        this.updateBindCond(attr);  

        //Update computed properties
        this.updateComputed(attr);   

        //Reset endpoints
        this.resetEndPoints(attr);   
    },

    updateComputed : function (attr) {
        var computed;
        for(i in this._computed_properties) {
            computed = this._computed_properties[i];
            for(j=0; j < computed.properties.length;j++) {
                if(computed.properties[j] == attr) {
                    this.updateAttrView(i);
                }
            }
        }
    },

    //Auto bind
    autoBind : function () {
        this.autoBindVar();
        this.autoBindCond();
        this.autoBindAttr();
        this.autoBindEndPoints();
        this.bindDOMEvents();
    },

    autoBindEndPoints : function () {
        var $el, _this = this;
        this.$el.find("[data-endpoint]").each(function (){
            $el = $(this);
            if(_this.inScope($el)) {
                _this.createEndPoint($el.data("var"), $el, 
                                     Function("return Emberfy." + _this.buildViewName($el.data("endpoint")) + 
                                     "Block")());
            }
        });  
    },

    buildViewName : function (view_name) {
        var name_arr = view_name.split('-');
        for(i in name_arr) {
            name_arr[i] = name_arr[i].charAt(0).toUpperCase() + name_arr[i].slice(1);
        }
        return name_arr.join('');
    },

    createEndPoint : function (attr, $el, View) {
        //Create the html and view endpoints, if they don't exist
        this.view_endpoints[attr] = this.view_endpoints[attr] || [];
        this.html_endpoints[attr] = this.html_endpoints[attr] || [];

        //Initialize the view
        var view = new View(this, $el, attr);

        //Push the endpoint
        this.view_endpoints[attr].push(view);
        this.html_endpoints[attr].push($el);

        //Build the property chain
        this.buildPropChain(attr);

        return view;
    },

    //Recreate view endpoints for a specific attribute
    resetEndPoints : function (attr) {

        //The class endpoints
        var view, class_endpoints, 
            html_endpoints = this.html_endpoints[attr];

        //Destroy endpoints
        class_endpoints = this.destroyEndPoints(attr);

        //Empty the view endpoint
        this.view_endpoints[attr] = [];

        //Recreate the endpoints
        for(i in html_endpoints) {
            view = new class_endpoints[i](this, html_endpoints[i], 
                                          attr);
            this.view_endpoints[attr].push(view);
        }
    },

    /*Destroy endpoints of an attribute, 
      and create class endpoints*/
    destroyEndPoints : function (attr) {
        var view, class_endpoints = [], 
            view_endpoints = this.view_endpoints[attr];
        
        for(i in view_endpoints) {
            view = view_endpoints[i];
            class_endpoints.push(view.constructor);
            view.destroy();
        }      

        return class_endpoints;
    },

    //Propagate chain rebuilding to endpoints
    propagateChainRebuilt : function (attr) {
        var property_chain = attr.split("."), property, property_root,
        view_endpoints, reverse_chain;
        reverse_chain = property_chain.pop();

        while(property_chain.length != 0) {
            property_root = property_chain.join(".");
            view_endpoints = this.view_endpoints[property_root];
            if(view_endpoints) {
                for(i in view_endpoints) {
                    view_endpoints[i].rebuildPropChain(reverse_chain);
                }
            }
            reverse_chain = property_chain.pop() + "." + reverse_chain;
        }
        
    },

    /*Verify if the target element is in scope.*/
    inScope : function (target) {
        var elt = target.parent();
        var view_elt = this.$el.get(0);
       
        /*If the target is the same 
          as the view element*/
        if(view_elt === target.get(0)) {
            return true;  
        }

        /*Verify the parents chain, 
          and verify if the target is inside an "endpoint"*/
        while (elt.get(0) !== document && elt.get(0) !== view_elt) {
            if(elt.data("endpoint")) {
                /*It is not in scope, 
                  if the element is inside a "endpoint"*/
                return false;
            }
            elt = elt.parent();
        }
        
        if(elt.get(0) === document) {
            //If the current element is document
            return false;
        } else {
            //If the current element is the view element
            return true;
        }
    },

    bindVar : function (attr, elt) {
        //Create the local variable binding if it doesn't exist 
        this.var_bind[attr] = this.var_bind[attr] || [];

        //Push the binding
        this.var_bind[attr].push(elt); 


        //Build the property chain
        this.buildPropChain(attr);
 
        //Initialize the binding
        elt.text(this.get(attr) || "").css("display", "inline");       
    },

    updateBindVar : function (attr) {
        var var_bind = this.var_bind[attr];
        var val = this.get(attr);

        if(var_bind) {
            for(i in var_bind) {
                var_bind[i].text(val).css("display", "inline");
            }
        }
    },

    autoBindVar : function () {
        var $el, _this = this;

        this.$el.find("script[type='emberfy/template'][data-var]").each(function (){
            $el = $(this);
            if(_this.inScope($el)) {
                _this.bindVar($el.data("var"), $el);
            }
        });
    },

    bindCond : function (attr, elt, condition) {
        //Create the local variable binding if it doesn't exist 
        this.cond_bind[attr] = this.cond_bind[attr] || [];

        //Push the binding
        this.cond_bind[attr].push([elt, condition]);

        //Build the property chain
        this.buildPropChain(attr);

        //Initialize the binding
        elt.css("display", !(this.get(attr) ^ condition) ? "inline" : "none");
    },

    updateBindCond : function (attr) {
        var cond_bind = this.cond_bind[attr];
        var val = this.get(attr);

        if(cond_bind) {
            for(i in cond_bind) {
                if(!Object.prototype.hasOwnProperty.call(cond_bind, i))
                     continue;
                var bind = cond_bind[i];
                bind[0].css("display", !(val ^ bind[1]) ? "inline" : "none");                
            }
        }
    },

    //TODO:Test other expression types
    autoBindCond : function () {
        var $el, cond, _this = this;

        //If conditions       
        cond = true;
        this.$el.find("[data-if]").each(function (){
            $el = $(this);
            if(_this.inScope($el)){
                _this.bindCond($el.data("if"), $el, cond);
            }
        });

        //Else conditions
        cond = false;
        this.$el.find("[data-else]").each(function (){
            $el = $(this); 
            if(_this.inScope($el)){
                _this.bindCond($el.data("else"), $el, cond);
            }
        });
    },

    //Bind the attribute of an element, to the object variable
    bindAttr : function (attr, target, target_attr) {

        //if the attribute is a class, bind a class
        if(target_attr == "class") {
            this.bindClasses(target, attr);
            return;
        }

        //Create the local attribute binding if it doesn't exist 
        this.attr_bind[attr] = this.attr_bind[attr] || [];

        //Push the binding
        this.attr_bind[attr].push([target, target_attr]);

        //Initialize the element attribute
        target.attr(target_attr, this.get(attr));
    },

    //Update the binding of the attributes
    updateBindAttr : function (attr) {
        var val = this.get(attr);
        var attr_bind = this.attr_bind[attr];
        if(attr_bind) {
            //Get through the attribute bindings
            for(i in attr_bind) {
                //Update the binding of each elements
                var bind = attr_bind[i];
                var target = bind[0];
                var target_attr = bind[1];
                target.attr(target_attr, val);
            }
        }
    },

    
    autoBindAttr : function () {
        var $el, _this = this, binds, binds_arr, bind, target_attr;
        this.$el.find("[data-bind-attr]").each(function (){
            $el = $(this);
            if(_this.inScope($el)) {
                binds = $el.data("bindAttr");
                  
                //Build attribute bindings array
                binds_arr = [];
                var quote_re = /(([^:\s]+)=([^:\s']+))/g;
                binds = binds.replace(quote_re, "$2:'$3'");  
                var match_re = /(([^:\s]+)='([^']+)')/g;
                binds_arr = binds.match(match_re);
                for(i in binds_arr) {
                   if(binds_arr[i] == "")
                     continue;
                    bind = binds_arr[i].split("="); 
                    _this.bindAttr(bind[1].slice(1, -1), $(this), 
                                   bind[0]);
                    
                }
            }
        });
    },

    bindClasses : function (target, target_classes) {
        var class_arr = target_classes.split(" ");
        for(i in class_arr) {
             this.bindClass(target, class_arr[i]);
        }
    },

    bindClass : function (target, target_class) {
        //Decompose the target class
        var bind = target_class.split(":");
        var attr = bind[0];

        if(attr != "") {
            //Case : Dynamic class
 
            //Create the class binding, if it doesn't exist
            this.cls_bind[attr] = this.cls_bind[attr] || [];
            var cls_bind = this.cls_bind[attr];

            //Set up the new binding
            var new_bind = {"target" : target, "on" : bind[1] || "", "off" : bind[2] || ""};

            //Push the new binding
            cls_bind.push(new_bind);
     
            //Initialize the class binding
            this.updateBindClass(attr, new_bind);

        } else {
            //Case : Static class
            //Initialize with the static class
            target.addClass(bind[1]);
        }
        
    },

    //Build Class from attribute name : isUrgent -> is-urgent
    //TODO:Verify in detail with Ember Behaviour
    buildCls : function (cls) {
        return cls.replace(/([A-Z])/g, function (c) { return "-" + c.toLowerCase();});
    },

    updateBindClasses : function (attr) {
        //Retrieve the class binding for the attribute
        var cls_bind = this.cls_bind[attr];

        if(cls_bind) {
            for(i in cls_bind) {
                var bind = cls_bind[i];
                this.updateBindClass(attr, bind);
            }
        }
    },

    updateBindClass : function (attr, bind) {
        var cls_add, cls_remove, cls;
        var val = this.get(attr);
        var target = bind["target"];
        var old = bind["old"] || ""; //Save the old attribute if set

        //Retrive the class binding
        if(!bind["on"] && !bind["off"]) {
            if(typeof(val) == "string") {
                cls_add = val;
                cls_remove = "";

                //Save the added class in the old attribute
                bind["old"] = cls_add;
            } else {
                cls_add = this.buildCls(attr);
                cls_remove = "";
            }
        } else {
            cls_add = bind["on"];
            cls_remove = bind["off"];
        }

        //Update the class
        if(val) {
            target.removeClass(cls_remove);
            target.addClass(cls_add);
        } else {
            target.removeClass(cls_add);
            target.addClass(cls_remove);

            //remove the old attribute and Reset it
            target.removeClass(old); 
            bind["old"] = "";
        }
    },

    //Binding DOM Events.TODO: Test this
    bindDOMEvents : function () {
        var func_str, handler, event, event_name, binded_handler, proxy;
        for(i in this.domEvents) {
            if(!Object.prototype.hasOwnProperty.call(this.domEvents, i))
                continue;
            event = this.domEvents[i];
            handler = this[event];
            if(handler) {
                binded_handler = handler;
            } else {
                if(this.parent) {
                    func_str = "handler = this.parent['" + event +"'];";
                    func_str += "if(handler) handler(arguments[0]);";
                    binded_handler = Function(func_str);
                }
            }

            if(binded_handler) {
                proxy = $.proxy(binded_handler, this);
                event_name = event != "doubleClick" ? event.toLowerCase() : "dblclick"; 
                this.$el.on(event_name, proxy);
                this.dom_bind[event_name] = proxy;
            }
        }
    },

    //Unbind DOM Events
    unbindDOMEvents : function () {
        for(event in this.dom_event) {
            this.$el.off(event, this.dom_event[proxy]);
        }
    },

    //Destroy the view
    destroy : function () {
        //Unbind the attached DOM Event
        this.unbindDOMEvents();

        //Destroy endpoints
        for(attr in this.view_endpoints) {
            this.destroyEndPoints(attr);
        }

        //Stop observing
        this.stopObserving();
    }
});

Emberfy.BaseBlock = Emberfy.BaseView.extend({
    init : function(parent, $el, parent_ns) {

        //Set the parent namespace
        this.parent_ns = parent_ns;

        //Call the super constructor
        Emberfy.BaseView.prototype.init.call(this, parent, $el);

        //Auto bind
        this.autoBind();
    },

    getAttr : function (attr) {
        return this.parent.get(this.parent_ns + "." + attr);
    },

    setAttr : function (attr, val, obj_attr_ref) {
        return this.parent.set(this.parent_ns + "." + attr, val, 
                               obj_attr_ref);
    }
});

Emberfy.EachBlock = Emberfy.BaseBlock.extend({
    
});

Emberfy.WithBlock = Emberfy.BaseBlock.extend({

});

Emberfy.EachEltBlock = Emberfy.BaseBlock.extend({
});

Emberfy.Component = Emberfy.BaseView.extend({
    init : function(parent, $el, data) {
        //Call the super constructor
        Emberfy.BaseView.prototype.init.call(this, parent, $el);

        //Auto bind
        this.autoBind();

        //Bind class names
        ////classNames
        if(this.classNames) {
            for(i in this.classNames) {
                this.bindClass(this.$el, ":" + this.classNames[i]);
            }
        }

        ////classNamBindings
        if(this.classNameBindings) {
            for(i in this.classNameBindings) {
                this.bindClass(this.$el, this.classNameBindings[i]);
            }    
        }

        //Bind attributes
        var bind;
        if(this.attributeBindings) {
            for(i in this.attributeBindings) {
                bind = this.attributeBindings[i].split(":");
                if(bind.length == 1) {
                    this.bindAttr(bind[0], this.$el, bind[0]);
                } else {
                    this.bindAttr(bind[0], this.$el, bind[1]);
                }
            }
        }
    }
});


//Create a new Computed Property
Emberfy.computed = function (computed) {
    return new Emberfy.ComputedProperty(computed);
}

//Computed Property Class
Emberfy.ComputedProperty = Emberfy.BaseObject.extend({

    init : function (computed) {
        Emberfy.BaseObject.prototype.init.call(this);
        this.computed = computed;
        this.properties = [];
    },

    property : function () {
        this.properties = [];
        var i = arguments.length;
        while(i--) {
            this.properties.push(arguments[i]);
        }
        return this;
    },

    setContext : function (context) {
        this.context = context;
    },

    callComputed : function () {
        return this.computed.call(this.context);
    }

});

//Export some classes to Ember namespace
Ember = {
    fake : true,
    get : Emberfy.get,
    set : Emberfy.set,
    Component : Emberfy.Component,
    A : Emberfy.A,
    computed : Emberfy.computed
}

//Emberfication des widgets
function emberfy() {
    var ns = "App"; //TODO: let this configurable
    var widgets = $('*[data-widget]');
    widgets.each(function (index) {
        var data = $(this).data(); 
        var widget_arr = data['widget'].split('-');
        for(i in widget_arr) {
            widget_arr[i] = widget_arr[i].charAt(0).toUpperCase() + widget_arr[i].slice(1);
        }
        var Comp = window[ns][widget_arr.join('') + "Component"];
        var comp = new Comp(undefined, $(this));
    });
}

//Lancer l'emberfication
$(function () {
    emberfy();
});
