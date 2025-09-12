/**
 * DataTables Export Configuration
 * Local file implementation for export buttons
 */
function initializeDataTableExport(tableId, options = {}) {
    const defaultOptions = {
        dom: '<"top"Bf>rt<"bottom"lip><"clear">',
        buttons: [
            {
                extend: 'copy',
                text: '<i class="ti ti-copy me-1"></i> Copy',
                className: 'btn btn-secondary',
                exportOptions: {
                    columns: ':not(.no-export)' // Exclude columns with no-export class
                },
                action: function (e, dt, node, config) {
                    // Trigger copy operation
                    $.fn.dataTable.ext.buttons.copyHtml5.action.call(this, e, dt, node, config);
                    
                    // Show SweetAlert notification
                    Swal.fire({
                        title: 'Copied!',
                        text: 'Data copied to clipboard!',
                        icon: 'success',
                        timer: 2000,
                        showConfirmButton: false,
                        toast: true,
                        position: 'top-end'
                    });
                }
            },
            {
                extend: 'csv',
                text: '<i class="ti ti-file-text me-1"></i> CSV',
                className: 'btn btn-secondary',
                exportOptions: {
                    columns: ':not(.no-export)' // Exclude columns with no-export class
                }
            },
            {
                extend: 'excel',
                text: '<i class="ti ti-file-spreadsheet me-1"></i> Excel',
                className: 'btn btn-success',
                exportOptions: {
                    columns: ':not(.no-export)' // Exclude columns with no-export class
                }
            },
            {
                extend: 'pdf',
                text: '<i class="ti ti-file-invoice me-1"></i> PDF',
                className: 'btn btn-danger',
                exportOptions: {
                    columns: ':not(.no-export)' // Exclude columns with no-export class
                },
                customize: function (doc) {
                    doc.defaultStyle.fontSize = 8;
                    doc.styles.tableHeader.fontSize = 9;
                    doc.content[1].table.widths = Array(doc.content[1].table.body[0].length + 1).join('*').split('');
                }
            },
            {
                extend: 'print',
                text: '<i class="ti ti-printer me-1"></i> Print',
                className: 'btn btn-info',
                exportOptions: {
                    columns: ':not(.no-export)' // Exclude columns with no-export class
                }
            }
        ],
        pageLength: 10,
        paging: true,          // Disable pagination
        info: false,            // Hide info text
        lengthChange: false, 
        responsive: true,
        language: {
            paginate: {
                previous: '<i class="ti ti-chevron-left"></i>',
                next: '<i class="ti ti-chevron-right"></i>'
            }
        },
        columnDefs: [{
            targets: 'no-export', // Target columns with no-export class
            orderable: false,    // Disable sorting
            searchable: false    // Disable searching
        }]
    };

    const mergedOptions = $.extend(true, {}, defaultOptions, options);
    
    return $(tableId).DataTable(mergedOptions);
}

// Initialize for all tables with class 'dataTable' by default
$(document).ready(function() {
    $('table.dataTable').each(function() {
        initializeDataTableExport('#' + $(this).attr('id'));
    });
});