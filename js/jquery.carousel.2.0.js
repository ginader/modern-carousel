(function($) {
    var debugMode = true;
    
    function debug(msg) {
        if(debugMode && window.console && window.console.log){
            window.console.log(msg);
        }
    }
    
    $.fn.cleanWhitespace = function() {
        textNodes = this.contents().filter(function(){
            return (this.nodeType == 3 && !/\S/.test(this.nodeValue));
        }).remove();
    };
    
    $.fn.carousel = function(config) {
        var defaults = {
            "visiblePanes": 1,
            "panesToMove": 1,
            "pagination": true,
            "speed": 200,
            "loop": false,
            "autoplay": false,
            "hovercontrols": false,
            "hoverpause": false,
            "delay": 2000,
            "transition": false
        };
        
        if (config) $.extend(defaults, config);
        
        this.each(function(){
            var timer,
                carousel = $(this),
                clip = carousel.find(".clip:first"),
                list = clip.find(">ul:first"),
                panels = list.find(">li");
            
            defaults.aspectVert = /(vertical)/i.test(list.get(0).className);
            
            carousel.data("playing", false);
            
            clip.css("overflow", "hidden");
            list.css("position", "relative");
            list.cleanWhitespace();
            
            var clipWidth = clip.width(),
                clipHeight = clip.get(0).offsetHeight,
                currentPane = 0,
                numPanes = panels.length - defaults.visiblePanes,
                delta = defaults.aspectVert ? Math.floor(clipHeight / defaults.visiblePanes) : Math.floor(clipWidth / defaults.visiblePanes);
            
            // Build basic carousel controls
            
            var controls = {
                    "prev": {},
                    "play": {},
                    "pause": {},
                    "next": {}
                },
                controlset = $('<div class="controls" />');
                basic = $('<ul class="basic" />');

            $.each(controls, function(name, value){
                controls[name]  = $('<li class="' + name + '"><button>' + name + '</button></li>')
                                    .find("button")
                                    .data("name", name)
                                    .end();
                
                basic.append(controls[name]);
            });

            basic.appendTo(controlset.appendTo(carousel));
            basic.delegate("button", "click", function(e){
                e.preventDefault();
                carousel.trigger("carousel-" + $(this).data("name"));
            });
            
            // Carousel pagination
            
            if (defaults.pagination) {
                var pagination = $('<ol class="pages" />');
                for (var i = 0; i < panels.length / defaults.panesToMove; i++) {
                    $('<li><button value="' + i + '">' + parseInt(i+1, 10) + '</button></li>').appendTo(pagination);
                }
                pagination.appendTo(carousel.find(".controls"));
                pagination.delegate("button", "click", function(e){
                    e.preventDefault();
                    carousel.trigger("carousel-jump", [e.target.value * defaults.panesToMove, currentPane]);
                });
            }
            
            if (defaults.hovercontrols)
                controlset.hide();
            
            // Carousel hover
            carousel.hover(function(e){
                if (defaults.hovercontrols)
                    controlset
                        .stop()
                        .fadeIn({"duration": 200, "queue": false});
                if (defaults.hoverpause) {
                    if (carousel.data("playing"))
                        var play = true;
                    carousel.trigger("carousel-pause");
                    if (play)
                        carousel.data("playing", true);
                }
            }, function(e){
                if (defaults.hovercontrols)
                    controlset
                        .fadeOut({"duration": 200, "queue": false});
                if (defaults.hoverpause && carousel.data("playing"))
                    carousel.trigger("carousel-play");
            });
            
            // Handy functions
            
            var active = function(control, state) {
                if (!state) {
                    control.addClass("disabled");
                    control.find("button")
                        .get(0)
                        .disabled = true;
                } else {
                    control.removeClass("disabled");
                    control.find("button")
                        .get(0)
                        .disabled = false;
                }
            }
            
            // Eventmageddon!
            
            carousel.bind("carousel-nav-state", function() {
                if (!defaults.loop) {
                    active(controls["prev"], !(currentPane == 0));
                    active(controls["next"], !(currentPane == numPanes));
                }
                if (defaults.pagination) {
                    carousel.find(".pages .current")
                        .removeClass("current");
                    carousel.find(".pages button")
                        .eq(Math.ceil(currentPane / defaults.panesToMove))
                        .closest("li")
                        .addClass("current");
                }
            });
            
            carousel.bind("carousel-jump", function(e, pane, lastPane) {
                if (pane < 0)
                    pane = defaults.loop ? numPanes : 0;
                if (pane > numPanes)
                    pane = defaults.loop ? 0 : numPanes;
                
                currentPane = pane;
                
                var animParams = {
                    duration: defaults.speed,
                    queue: false,
                    complete: function(){
                        carousel.trigger("carousel-nav-state");
                    }
                };
                
                if (defaults.transition) {
                    carousel.carousel[defaults.transition](carousel, lastPane, currentPane, animParams);
                } else {
                    if (defaults.aspectVert) {
                        list.animate({
                            top: (-delta * currentPane) + "px"
                        }, animParams);
                    } else {
                        list.animate({
                            left: (-delta * currentPane) + "px"
                        }, animParams);
                    }
                }
            });
            
            carousel.bind("carousel-move", function(e, panes) {
                var lastPane = currentPane;
                panes = panes || 1;
                currentPane += panes * defaults.panesToMove;
                carousel.trigger("carousel-jump", [currentPane, lastPane]);
                if (carousel.data("playing") && !defaults.loop && currentPane == numPanes)
                    carousel.trigger("carousel-pause");
            });
            
            carousel.bind("carousel-prev", function(e) {
                carousel.trigger("carousel-pause");
                carousel.trigger("carousel-move", -1);
            });
            
            carousel.bind("carousel-next", function(e) {
                carousel.trigger("carousel-pause");
                carousel.trigger("carousel-move", 1);
            });
            
            carousel.bind("carousel-play", function(e) {
                carousel.data("playing", true);
                active(controls["play"], false);
                active(controls["pause"], true);
                timer = window.setInterval(function() {
                    carousel.trigger("carousel-move", 1);
                }, defaults.delay);
            });
            
            carousel.bind("carousel-pause", function(e) {
                carousel.data("playing", false);
                active(controls["pause"], false);
                active(controls["play"], true);
                clearInterval(timer);
            });
            
            // Initialisation complete; fire her up.
            
            carousel.trigger("carousel-nav-state");
            
            if (defaults.autoplay) {
                carousel.trigger("carousel-play");
            } else {
                carousel.trigger("carousel-pause");
            }
        });
        
        return this;
    };
    
    $.fn.carousel.fade = function(carousel, current, next, animParams) {
        var currentPaneEl   = carousel.find(".clip>ul>li").eq(current),
            nextPaneEl      = carousel.find(".clip>ul>li").eq(next),
            list            = carousel.find(".clip>ul");
        
        currentPaneEl
            .css('position', 'absolute')
            .css('top', '0')
            .css('left', '0')
            .css('z-index', '1');
        
        nextPaneEl
            .hide()
            .css('position', 'absolute')
            .css('top', '0')
            .css('left', '0')
            .css('z-index', '2');
        
        animParams.complete = function() {
            currentPaneEl.hide();
            carousel.trigger("carousel-nav-state");
        };
        nextPaneEl.fadeIn(animParams);
    };
})(jQuery);