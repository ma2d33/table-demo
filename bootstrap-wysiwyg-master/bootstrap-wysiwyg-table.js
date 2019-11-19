var editor = $('#editor');
	editor.wysiwyg();

	editor.on('click',function(e){
		if(e.target.nodeName != 'TD'){
			cell_menu.hide(200);
		}
		else{
		my_funct(e.target);
		}
	});

	var tbl_cell;
	var mouse_x,mouse_y;
	var cell_menu = $("#tbl_options");

	function my_funct(e){
	  tbl_cell = e;		
	  cell_menu.css({
	  	'top':mouse_y,
	  	'left':mouse_x
	  });
	  cell_menu.show(200);
	}

	$('#tbl_cell_left').click(function() {
		$(tbl_cell).before('<td>New Cell</td>')
		cell_menu.hide(200);
	});
	$('#tbl_cell_right').click(function() {
		$(tbl_cell).after('<td>New Cell</td>')
		cell_menu.hide(200);
	});
	$('#tbl_add_row').click(function() {
		$(tbl_cell).parent('tr').after('<tr><td>New Cell</td></tr>');
		cell_menu.hide(200);
	});
	$('#tbl_cell_left_del').click(function() {
		if($(tbl_cell).prev().length){
			$(tbl_cell).prev().remove();
			cell_menu.hide(200);
		}
	});
	$('#tbl_cell_right_del').click(function() {
		if($(tbl_cell).next().length){
			$(tbl_cell).next().remove();
			cell_menu.hide(200);
		}
	});
	$('#tbl_row_del').click(function(){
		$(tbl_cell).parent('tr').remove();
		cell_menu.hide(200);
	});

	$(document).on('mousemove', e => {
		mouse_x = e.pageX;
		mouse_y = e.pageY;
	});

