/* http://github.com/mindmup/bootstrap-wysiwyg */
/*global jQuery, $, FileReader*/
/*jslint browser:true*/
(function ($) {
	'use strict';
	var readFileIntoDataUrl = function (fileInfo) {
		var loader = $.Deferred(),
			fReader = new FileReader();
		fReader.onload = function (e) {
			loader.resolve(e.target.result);
		};
		fReader.onerror = loader.reject;
		fReader.onprogress = loader.notify;
		fReader.readAsDataURL(fileInfo);
		return loader.promise();
	};
	$.fn.cleanHtml = function () {
		var html = $(this).html();
		return html && html.replace(/(<br>|\s|<div><br><\/div>|&nbsp;)*$/, '');
	};
	$.fn.wysiwyg = function (userOptions) {
		var editor = this,
			selectedRange,
			options,
			toolbarBtnSelector,
			updateToolbar = function () {
				if (options.activeToolbarClass) {
					$(options.toolbarSelector).find(toolbarBtnSelector).each(function () {
						var command = $(this).data(options.commandRole);
						if (document.queryCommandState(command)) {
							$(this).addClass(options.activeToolbarClass);
						} else {
							$(this).removeClass(options.activeToolbarClass);
						}
					});
				}
			},
			execCommand = function (commandWithArgs, valueArg) {
				var commandArr = commandWithArgs.split(' '),
					command = commandArr.shift(),
					args = commandArr.join(' ') + (valueArg || '');
					if(command == "insertHTML"){
						let rows = $('input[name="tbl-rows"]').val();
						let cells = $('input[name="tbl-cells"]').val();

						var c = ""; 
						var r = "";
						for (cells; cells > 0; cells--) {
							c +='<td>New cell</td>';
						}
						for (rows;rows > 0;rows--){
							r += '<tr>'+c+'</tr>';
						}

						args = '<table class="table table-bordered my-table">'+r+'</table>';
						document.execCommand(command, 0, args);
						updateToolbar();
						// die();
					}
					else{
						document.execCommand(command, 0, args);
						updateToolbar();
					}
			},
			bindHotkeys = function (hotKeys) {
				$.each(hotKeys, function (hotkey, command) {
					editor.keydown(hotkey, function (e) {
						if (editor.attr('contenteditable') && editor.is(':visible')) {
							e.preventDefault();
							e.stopPropagation();
							execCommand(command);
						}
					}).keyup(hotkey, function (e) {
						if (editor.attr('contenteditable') && editor.is(':visible')) {
							e.preventDefault();
							e.stopPropagation();
						}
					});
				});
			},
			getCurrentRange = function () {
				var sel = window.getSelection();
				if (sel.getRangeAt && sel.rangeCount) {
					return sel.getRangeAt(0);
				}
			},
			saveSelection = function () {
				selectedRange = getCurrentRange();
			},
			restoreSelection = function () {
				var selection = window.getSelection();
				if (selectedRange) {
					try {
						selection.removeAllRanges();
					} catch (ex) {
						document.body.createTextRange().select();
						document.selection.empty();
					}

					selection.addRange(selectedRange);
				}
			},
			insertFiles = function (files) {
				editor.focus();
				$.each(files, function (idx, fileInfo) {
					if (/^image\//.test(fileInfo.type)) {
						$.when(readFileIntoDataUrl(fileInfo)).done(function (dataUrl) {
							execCommand('insertimage', dataUrl);
						}).fail(function (e) {
							options.fileUploadError("file-reader", e);
						});
					} else {
						options.fileUploadError("unsupported-file-type", fileInfo.type);
					}
				});
			},
			markSelection = function (input, color) {
				restoreSelection();
				if (document.queryCommandSupported('hiliteColor')) {
					document.execCommand('hiliteColor', 0, color || 'transparent');
				}
				saveSelection();
				input.data(options.selectionMarker, color);
			},
			bindToolbar = function (toolbar, options) {
				toolbar.find(toolbarBtnSelector).click(function () {
					restoreSelection();
					editor.focus();
					execCommand($(this).data(options.commandRole));
					saveSelection();
				});
				toolbar.find('[data-toggle=dropdown]').click(restoreSelection);

				toolbar.find('input[type=text][data-' + options.commandRole + ']').on('webkitspeechchange change', function () {
					var newValue = this.value; /* ugly but prevents fake double-calls due to selection restoration */
					this.value = '';
					restoreSelection();
					if (newValue) {
						editor.focus();
						execCommand($(this).data(options.commandRole), newValue);
					}
					saveSelection();
				}).on('focus', function () {
					var input = $(this);
					if (!input.data(options.selectionMarker)) {
						markSelection(input, options.selectionColor);
						input.focus();
					}
				}).on('blur', function () {
					var input = $(this);
					if (input.data(options.selectionMarker)) {
						markSelection(input, false);
					}
				});
				toolbar.find('input[type=file][data-' + options.commandRole + ']').change(function () {
					restoreSelection();
					if (this.type === 'file' && this.files && this.files.length > 0) {
						insertFiles(this.files);
					}
					saveSelection();
					this.value = '';
				});
			},
			initFileDrops = function () {
				editor.on('dragenter dragover', false)
					.on('drop', function (e) {
						var dataTransfer = e.originalEvent.dataTransfer;
						e.stopPropagation();
						e.preventDefault();
						if (dataTransfer && dataTransfer.files && dataTransfer.files.length > 0) {
							insertFiles(dataTransfer.files);
						}
					});
			};
		options = $.extend({}, $.fn.wysiwyg.defaults, userOptions);
		toolbarBtnSelector = 'a[data-' + options.commandRole + '],button[data-' + options.commandRole + '],input[type=button][data-' + options.commandRole + ']';
		bindHotkeys(options.hotKeys);
		if (options.dragAndDropImages) {
			initFileDrops();
		}
		bindToolbar($(options.toolbarSelector), options);
		editor.attr('contenteditable', true)
			.on('mouseup keyup mouseout', function () {
				saveSelection();
				updateToolbar();
			});
		$(window).bind('touchend', function (e) {
			var isInside = (editor.is(e.target) || editor.has(e.target).length > 0),
				currentRange = getCurrentRange(),
				clear = currentRange && (currentRange.startContainer === currentRange.endContainer && currentRange.startOffset === currentRange.endOffset);
			if (!clear || isInside) {
				saveSelection();
				updateToolbar();
			}
		});

		// table expansion

		var tbl_cell;
		var mouse_x,mouse_y;
		var tblMenuOpen = true;
		var cell_menu = '<nav id="table_cell_menu">'
						+'<ul>'
							+'<li id="deleteTable" title="Delete Table">Delete Table</li>'
							+'<li id="addTopRow" title="Add row on top">Add row top</li>'
							+'<li id="addBottomRow" title="Add row on bottom">Add row bottom</li>'
							+'<li id="deleteRow" title="Delete this row">Delete row</li>'
							+'<li id="addColLeft" title="Add column right">Add column left</li>'
							+'<li id="addColRight" title="Add column left">Add column right</li>'
							+'<li id="deleteColumn" title="Delete this column">Delete Column</li>'
							+'<li id="combainCells" title="combain cells">combain</li>'
							+'<li id="colorPicker" title="color">Pic color</li>'
						+'</ul>'	
					'</nav>';

		editor.after(cell_menu);			

		editor.on('click',function(e){
			if(e.target.nodeName == 'TD' && e.ctrlKey){
				mouse_x = e.pageX;
				mouse_y = e.pageY;
				tbl_cell = e.target;
				showTblMenu();
			}
			else{
				hideTblMenu(cell_menu)
			}
		});

		function showTblMenu(){
			if(tblMenuOpen){
				$('#table_cell_menu').css({
					'top':mouse_y - 55,
        			'left':mouse_x - 55
				});
				$('#table_cell_menu').show();
				$('#table_cell_menu').animate({
					height:"30px"
				},100,function(){tblMenuOpen=false});
			}
			else {
				$('#table_cell_menu').animate({
					height:0,
				},100,function(){tblMenuOpen=true,$('#table_cell_menu').hide()});
			}
		}

		function hideTblMenu(){
			$('#table_cell_menu').animate({
				height:0,
			},100,function(){tblMenuOpen=true,$('#table_cell_menu').hide()});
		}

		// button functions
			$('#deleteTable').click(function(){
				$(tbl_cell).parents('table').remove();
				hideTblMenu(cell_menu)
			});

			$('#deleteRow').click(function(){
				$(tbl_cell).parent('tr').remove();
				hideTblMenu(cell_menu)
			});

			$('#addTopRow').click(function(){
				let num_cells = $(tbl_cell).parent('tr').children('td').length;
				let cells = "";
				for(num_cells;num_cells > 0; num_cells--){
					cells +='<td>New created cell</td>'; 
				}
				$(tbl_cell).parent('tr').before('<tr>'+cells+'</tr>');
				hideTblMenu(cell_menu);
			});
			$('#addBottomRow').click(function(){
				let num_cells = $(tbl_cell).parent('tr').children('td').length;
				let cells = "";
				for(num_cells;num_cells > 0; num_cells--){
					cells +='<td>New created cell</td>'; 
				}
				$(tbl_cell).parent('tr').after('<tr>'+cells+'</tr>');
				hideTblMenu(cell_menu);
			});

			$('#addColLeft').click(function(){
				let ind = $(tbl_cell).index();
				let table_rows = $(tbl_cell).parents('table').find('>tbody>tr');
				table_rows.each(function(e, d) {
					$(d).children('td').eq(ind).before('<td>New Created Cell</td>');
				});
				hideTblMenu(cell_menu)
			});

			$('#addColRight').click(function(){
				let ind = $(tbl_cell).index();
				let table_rows = $(tbl_cell).parents('table').find('>tbody>tr');
				table_rows.each(function(e, d) {
					$(d).children('td').eq(ind).after('<td>New Created Cell</td>');
				});
				hideTblMenu(cell_menu)
			});

			$('#deleteColumn').click(function(){
				let ind = $(tbl_cell).index();
				let table_rows = $(tbl_cell).parents('table').find('>tbody>tr');
				table_rows.each(function(e, d) {
					$(d).children('td').eq(ind).remove();
				});
				hideTblMenu(cell_menu)
			});
			
		// ----------------

		// bonus functions
		$('#tbl_cell_left').click(function() {
			$(tbl_cell).before('<td>New Cell</td>')
			hideTblMenu(cell_menu)
		});
		$('#tbl_cell_right').click(function() {
			$(tbl_cell).after('<td>New Cell</td>')
			hideTblMenu(cell_menu)
		});
		$('#tbl_cell_left_del').click(function() {
			if($(tbl_cell).prev().length){
				$(tbl_cell).prev().remove();
				if($(tbl_cell).prev().length){
					$(tbl_cell)
					.siblings()
					.first()
					.attr("colspan","100%");
				}
				else{
					$(tbl_cell).attr("colspan","100%");
				}
				hideTblMenu(cell_menu)
			}
		});
		$('#tbl_cell_right_del').click(function() {
			if($(tbl_cell).next().length){
				$(tbl_cell).next().remove();
				if($(tbl_cell).next().length){
					$(tbl_cell)
					.siblings()
					.last()
					.attr("colspan","100%");
				}
				else{
					$(tbl_cell).attr('colspan', '100%');
				}
				hideTblMenu(cell_menu)
			}
		});
		// -----------

		return this;
	};

	$.fn.wysiwyg.defaults = {
		hotKeys: {
			'ctrl+b meta+b': 'bold',
			'ctrl+i meta+i': 'italic',
			'ctrl+u meta+u': 'underline',
			'ctrl+z meta+z': 'undo',
			'ctrl+y meta+y meta+shift+z': 'redo',
			'ctrl+l meta+l': 'justifyleft',
			'ctrl+r meta+r': 'justifyright',
			'ctrl+e meta+e': 'justifycenter',
			'ctrl+j meta+j': 'justifyfull',
			'shift+tab': 'outdent',
			'tab': 'indent'
		},
		toolbarSelector: '[data-role=editor-toolbar]',
		commandRole: 'edit',
		activeToolbarClass: 'btn-info',
		selectionMarker: 'edit-focus-marker',
		selectionColor: 'darkgrey',
		dragAndDropImages: true,
		fileUploadError: function (reason, detail) { console.log("File upload error", reason, detail); }
	};
}(window.jQuery));
