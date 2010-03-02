Glow.provide(function(glow) {
	var NodeListProto = glow.NodeList.prototype,
		undefined,
		parseFloat = window.parseFloat,
		cssTemplates,
		// used to detect which CSS properties require units
		simpleValWithUnitsRe = /width|height|top$|bottom$|left$|right$|spacing$|indent$|font-size/,
		getUnit = /\D+$/,
		usesYAxis = /height|top/;
		
	// these templates are used for animating complex CSS values
	// (simpler values are handled with regex)
	// u1...un is replaced with a CSS unit later
	// values are: [template, round, allowNegative]
	cssTemplates = {
		'background-position': ['?u1 ?u2', 1, 1]
	}
	
	// TODO: get this from appearence.js
	function toStyleProp(prop) {
		if (prop == 'float') {
			return glow.env.ie ? 'styleFloat' : 'cssFloat';
		}
		return prop.replace(/-(\w)/g, function(match, p1) {
			return p1.toUpperCase();
		});
	}
	
	/**
		@private
		@function
		@param {nodelist} element
		@param {string} toUnit (em|%|pt...)
		@param {string} axis (x|y)
		@description Converts a css unit.
			We need to know the axis for calculating relative values, since they're
			relative to the width / height of the parent element depending
			on the situation.
	*/
	var testElement = glow('<div style="position:absolute;visibility:hidden;border:0;margin:0;padding:0"></div>');
	
	function convertCssUnit(element, value, toUnit, axis) {
		var elmStyle = testElement[0].style,
			axisProp = (axis === 'x') ? 'width' : 'height',
			startPixelValue,
			toUnitPixelValue;
		
		startPixelValue = testElement.css(axisProp, value).insertAfter(element)[axisProp]();
		// using 10 of the unit then dividing by 10 to increase accuracy
		toUnitPixelValue = testElement.css(axisProp, 10 + toUnit)[axisProp]() / 10;
		testElement.remove();
		return startPixelValue / toUnitPixelValue;
	}
	
	/**
		@name glow.NodeList#anim
		@function
		@description Animate CSS properties of elements
			All CSS properties which are simple numbers (width, top, margin-left etc)
			are supported. Additionally, the following more complex properties are
			supported:
			
			<ul>
				<li>TODO</li>
			</ul>
		
		@param {number} duration Length of the animation in seconds.
		@param {Object} properties Properties to animate.
			This is an object where the key is the CSS property and the value
			is the value to animate to.
			
			The value can also be an array, where the first item is the value to
			animate from, and the second is the value to animate to.
			
			Numerical values will be treated as 'px' if the property requires units.
		
		@param {Object} [opts] Options object
		@param {function|string} [opts.tween='easeBoth'] The motion of the animation.
			Strings are treated as properties of {@link glow.tweens}, although
			a tween function can be provided.
		@param {boolean} [opts.destroyOnComplete=true] Destroy the animation once it completes (unless it loops).
			This will free any DOM references the animation may have created. Once
			the animation is destroyed, it cannot be started again.
		@param {boolean} [opts.loop=true] Loop the animation.
		@param {boolean} [opts.startNow=true] Start the animation straight away?
			Animations can be started by calling {@link glow.anim.Anim#start}
		
		@returns {glow.anim.Anim}
		
		@example
			// change the nav's background colour to white and the top position
			// to 20px over a duration of 3 seconds
			glow('#nav').anim(3, {
				'background-color': '#fff',
				'top': 20
			});
			
		@example
			// Fade an element out and alert 'done' when complete
			glow('#nav').anim(3, {
				'opacity': 0
			}).on('complete', function() {
				alert('done!');
			});
		
		@see {@link glow.NodeList#queueAnim} - Queue an animation to run after the current anim
		@see {@link glow.NodeList#fadeIn} - Shortcut to fade elements in
		@see {@link glow.NodeList#fadeOut} - Shortcut to fade elements out
		@see {@link glow.NodeList#fadeToggle} - Shortcut to toggle the fade of an element
		@see {@link glow.NodeList#slideOpen} - Shortcut to slide an element open
		@see {@link glow.NodeList#slideShut} - Shortcut to slide an element shut
		@see {@link glow.NodeList#slideToggle} - Shortcut to toggle an element open / shut

	*/
	NodeListProto.anim = function(duration, properties, opts) {
		var anim = new glow.anim.Anim(duration).target( this[0].style ),
			to,
			from,
			fromUnit,
			toUnit,
			property,
			round,
			propertyIsArray;
		
		for (var propName in properties) {
			property = properties[propName];
			propertyIsArray = property.push;
			to   = propertyIsArray ? property[1] : property;
			from = propertyIsArray ? property[0] : this.css(propName);
			
			// are we dealing with a simple number + unit, eg "5px"
			if ( simpleValWithUnitsRe.test(propName) ) {
				toUnit   = ( getUnit.exec(to)   || ['px'] )[0];
				fromUnit = ( getUnit.exec(from) || ['px'] )[0];
				round = (toUnit === 'px');
				
				if (toUnit !== fromUnit) {
					from = convertCssUnit( this[0], from, toUnit, usesYAxis.test(propName) ? 'y' : 'x' );
				}
				
				anim.prop(toStyleProp(propName), {
					template: '?' + toUnit,
					from: parseFloat(from),
					to: parseFloat(to),
					round: round
				})
			}
			else {
				throw new Error('Not yet implemented');
			}
		}
		
		return anim.start();
	};
	
	/**
		@name glow.NodeList#queueAnim
		@function
		@description Queue an animation to run after the current animation
			This supports the same CSS properties as {@link glow.NodeList#anim},
			but the animation is not started until the previous animation (added
			via {@link glow.NodeList#anim anim} or {@link glow.NodeList#queueAnim queueAnim})
			on that element ends.
			
			If there are no queued animations on the element, the animation starts
			straight away.
		
		@param {number} duration Length of the animation in seconds.
		@param {Object} Properties to animate.
			This is an object where the key is the CSS property and the value
			is the value to animate to.
			
			The value can also be an array, where the first item is the value to
			animate from, and the second is the value to animate to.
			
			Numerical values will be treated as 'px' if the property requires units.
		
		@param {Object} [opts] Options object
		@param {function|string} [opts.tween='easeBoth'] The motion of the animation.
			Strings are treated as properties of {@link glow.tweens}, although
			a tween function can be provided.
		@param {boolean} [opts.destroyOnComplete=true] Destroy the animation once it completes (unless it loops).
			This will free any DOM references the animation may have created. Once
			the animation is destroyed, it cannot be started again.
		@param {boolean} [opts.loop=true] Loop the animation.
		@param {boolean} [opts.startNow=false] Start the animation straight away?
		
		@returns {glow.anim.Anim}
		
		@example
			// change a nav item's background colour from white to yellow
			// when the mouse is over it, and back again when the mouse
			// exits.
			glow('#nav').delegate('mouseenter', 'li', function() {
				glow(this).queueAnim(0.5, {
					'background-color': 'yellow'
				});
			}).delegate('mouseleave', 'li', function() {
				glow(this).queueAnim(0.5, {
					'background-color': 'white'
				});
			});
		
		@see {@link glow.NodeList#fadeIn} - Shortcut to fade elements in
		@see {@link glow.NodeList#fadeOut} - Shortcut to fade elements out
		@see {@link glow.NodeList#fadeToggle} - Shortcut to toggle the fade of an element
		@see {@link glow.NodeList#slideOpen} - Shortcut to slide an element open
		@see {@link glow.NodeList#slideShut} - Shortcut to slide an element shut
		@see {@link glow.NodeList#slideToggle} - Shortcut to toggle an element open / shut

	*/
	NodeListProto.queueAnim = function() {
		// implementation note, don't calculated the 'from' values until we're
		// just about to play
	};
	
	/**
		@name glow.NodeList#fadeIn
		@function
		@description Fade elements in
			If the element is currently fading out, the fadeOut animation will be automatically stopped.
		
		@param {number} [duration=1] Duration in seconds
		@param {Object} [opts] Options object
		@param {function|string} [opts.tween='easeOut'] The motion of the animation.
			Strings are treated as properties of {@link glow.tweens}, although
			a tween function can be provided.
			
		@returns {glow.anim.Anim}
		
		@example
			// make a tooltip fade in & out
			var tooltip = glow('#emailTooltip');
			
			glow('#emailInput').on('focus', function() {
				tooltip.fadeIn();
			}).on('blur', function() {
				tooltip.fadeOut();
			});
	*/
	NodeListProto.fadeIn = function() {};
	
	/**
		@name glow.NodeList#fadeOut
		@function
		@description Fade elements out
			If the element is currently fading in, the fadeIn animation will be automatically stopped.
		
		@param {number} [duration=1] Duration in seconds
		@param {Object} [opts] Options object
		@param {function|string} [opts.tween='easeIn'] The motion of the animation.
			Strings are treated as properties of {@link glow.tweens}, although
			a tween function can be provided.
			
		@returns {glow.anim.Anim}
		
		@example
			// make a tooltip fade in & out
			var tooltip = glow('#emailTooltip');
			
			glow('#emailInput').on('focus', function() {
				tooltip.fadeIn();
			}).on('blur', function() {
				tooltip.fadeOut();
			});
	*/
	NodeListProto.fadeOut = function() {};
	
	/**
		@name glow.NodeList#fadeToggle
		@function
		@description Fade elements in/out
			If the element is currently fading in/out, the fadeIn/fadeOut animation
			will be automatically stopped.
			
			// Implementation note: (delete me later)
			If the element has an opactity of 0, then fade in, otherwise fade out.
			UNLESS there's fadeOut animation currently happening on this element,
			then fade in.
			
		@param {number} [duration=1] Duration in seconds
		@param {Object} [opts] Options object
		@param {function|string} [opts.tween] The motion of the animation.
			Strings are treated as properties of {@link glow.tweens}, although
			a tween function can be provided.
			
			By default, 'easeIn' is used for fading out, and 'easeOut' is
			used for fading in.
			
		@returns {glow.anim.Anim}
		
		@example
			// make a tooltip fade in & out
			var tooltip = glow('#emailTooltip');
			
			glow('#toggleTooltip').on('click', function() {
				tooltip.fadeToggle();
			});
	*/
	NodeListProto.fadeToggle = function() {};
	
	/**
		@name glow.NodeList#slideOpen
		@function
		@description Slide elements open
			This animates an element's height from its current height to its
			full auto-height size.
			
			If the element is currently sliding shut, the slideShut animation
			will be automatically stopped.
			
			// Implementation note: (delete me later)
			This is a simplification from Glow 1. Glow 1 would try to determine
			if it should animate to height:auto or the height set in the CSS. But
			this got messy if the height was set to zero in the CSS.
			
			Also, Glow 1 may have always started this animation at zero-height,
			but animating it from its current height is better IMO
		
		@param {number} [duration=1] Duration in seconds
		@param {Object} [opts] Options object
		@param {function|string} [opts.tween='easeBoth'] The motion of the animation.
			Strings are treated as properties of {@link glow.tweens}, although
			a tween function can be provided.
			
		@returns {glow.anim.Anim}
		
		@example
			var menuContent = glow('#menu div.content');
			
			glow('#menu').on('mouseenter', function() {
				menuContent.slideOpen();
			}).on('mouseleave', function() {
				menuContent.slideShut();
			});
		
		@example
			glow('#furtherInfoHeading').on('click', function() {
				glow('#furtherInfoContent').slideOpen();
			});
			
		@example
			// add content onto an element, and slide to reveal the new content
			glow('<div>' + newContent + '</div>').appendTo('#content').height(0).slideOpen();
			
	*/
	NodeListProto.slideOpen = function() {};
	
	/**
		@name glow.NodeList#slideShut
		@function
		@description Slide elements shut
			This animates an element's height from its current height to zero.
			
			If the element is currently sliding open, the slideOpen animation
			will be automatically stopped.
		
		@param {number} [duration=1] Duration in seconds
		@param {Object} [opts] Options object
		@param {function|string} [opts.tween='easeBoth'] The motion of the animation.
			Strings are treated as properties of {@link glow.tweens}, although
			a tween function can be provided.
			
		@returns {glow.anim.Anim}
		
		@example
			var menuContent = glow('#menu div.content');
			
			glow('#menu').on('mouseenter', function() {
				menuContent.slideOpen();
			}).on('mouseleave', function() {
				menuContent.slideShut();
			});
	*/
	NodeListProto.slideShut = function() {};
	
	/**
		@name glow.NodeList#slideToggle
		@function
		@description Slide elements open/shut
			If the element is currently sliding open/shut, the slideOpen/slideShut animation
			will be automatically stopped.
			
			// Implementation note: (delete me later)
			If the element has a height of 0, then slide open, otherwise slide shut.
			UNLESS there's slideShut animation currently happening on this element,
			then slide open.
		
		@param {number} [duration=1] Duration in seconds
		@param {Object} [opts] Options object
		@param {function|string} [opts.tween='easeBoth'] The motion of the animation.
			Strings are treated as properties of {@link glow.tweens}, although
			a tween function can be provided.
			
		@returns {glow.anim.Anim}
		
		@example
			var menuContent = glow('#menuContent');
			
			glow('#toggleMenu').on('click', function() {
				menuContent.slideToggle();
			});
	*/
	NodeListProto.slideToggle = function() {};
});