(function() {
	window.manualTests = window.manualTests || {};
	
	// output the source for a given script element
	function revealSrcFor(scriptElm) {
		// filter code so it can be safely displayed
		var code = getSource( scriptElm ),
			preElement = document.createElement("pre");
		
		// TODO move this stuff into a stylesheet?
		preElement.style.border = '1px solid #ccc';
		preElement.style.padding = '10px';
		preElement.style.maxHeight = '200px';
		preElement.style.overflow = 'auto';
		
		preElement.className = "src";
		preElement.innerHTML = "<code>" + code + "<\/code>";
		scriptElm.parentNode.insertBefore(preElement, scriptElm);
	}
	
	// gets the source for a given script element, tidies it up, returns an html string
	function getSource( scriptElm ) {
		var code = scriptElm.innerHTML;
		
		// trim empty lines at start & end
		code = code.replace("// <![CDATA[", "").replace("// ]]>", "").replace(/^(\s*\n\r?)*|(\n\r?\s*)*$/g, '');
		
		// match the initial spacing of the first line, so we can shift it left
		var initialWhiteSpaceRe = new RegExp("^" + code.match(/^\s*/)[0], "mg");
		
		code = code.replace(initialWhiteSpaceRe, '')
			.replace("// <![CDATA[", "").replace("// ]]>", "")
			// simple html encoding
			.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
			// tabs to spaces
			.replace(/\t/g, "&nbsp;&nbsp;&nbsp;&nbsp;")
			// change newlines to <br />
			.replace(/\n\r?/g, "<br />");
			
		return code;
	}
	
	/**
	@name manualTests.showSrc
	@function
	@description Outputs script elements with a given class so they can be read
	
	@param {String} [className=showSrc] Only show scripts with this classname
	*/
	manualTests.showSrc = function(className) {
		var classNamePadded = ' ' + (className || 'showSrc') + ' ';
		
		var scriptElms = document.getElementsByTagName('script'),
			i = scriptElms.length;
		
		while (i--) {
			// does the script element have the class name?
			if ( (' ' + scriptElms[i].className + ' ').indexOf(classNamePadded) != -1 ) {
				revealSrcFor(scriptElms[i]);
			}
		}
	}
})();