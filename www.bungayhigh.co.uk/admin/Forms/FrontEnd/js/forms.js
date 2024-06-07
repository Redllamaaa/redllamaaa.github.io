$(function () {

  $('.datepairpicker').datepair({
    parseDate: function (el) {
      var val = $(el).datepicker('getDate');
      if (!val) {
        return null;
      }
      var utc = new Date(val);
      return utc && new Date(utc.getTime() + (utc.getTimezoneOffset() * 60000));
    },
    updateDate: function (el, v) {
      $(el).datepicker('setDate', new Date(v.getTime() - (v.getTimezoneOffset() * 60000)));
    }
  });

  $('.select-multiple').multiSelect(); // initialise all multiselects
  $('.select-multiple').change(function () { // check for trigger
    if ($(this).data('tqid')) {
      var v = $(this).val();
      v = v.toString().replace(',', ', ');            
      formTriggerQuestion($(this).data('tqid'), 1, v);
    }
  });

  $(".FormCapture").submit(function (event) {
    event.preventDefault(); 
    if (!$("#payment-element").length) {
      $("#FORM__formSubmit").prop("disabled", true).val('Saving...');
      formCapture(1);
    }
  });

  $("#FORM__formSubmit").click(function () {    
    if (!$("#payment-element").length) {      
      setFormSubmitButton(false);
      if (!$(".FormCapture")[0].checkValidity()) {
       formCapture(0);
      }      
    } 
  });

  // required status for not currently visible
  $('.hasRequired').each(function (i, obj) {
    if(!$(this).is(':visible')) {      
      $(this).attr('required', false);
    };
  });

}); // end doc ready

// required status on visibility change (linked question)
(function ($) {
  $.each(['show', 'hide'], function (i, ev) {
    var el = $.fn[ev];
    $.fn[ev] = function () {
      this.trigger(ev);
      return el.apply(this, arguments);
    };
  });
})(jQuery);
// check for question visibility and required status (linked question)
$(function () {
  $('.isLinkedQuestion').on('show', function (el) {    
    $(this).find('.hasRequired').each(function () {
      $(this).attr('required', true);
    });
  });
  $('.isLinkedQuestion').on('hide', function (el) {    
    $(this).find('.hasRequired').each(function () {
      $(this).attr('required', false);
    });
  });
});


function formTriggerQuestion(qid, ltv, v)  {  
  $('#flnk_' + qid).hide();  
  if (ltv == 1) {
    $('#linkedTriggerValue_'+qid).val(v);
  } else if (ltv == 2) {
    $('#linkedTriggerValue2_' + qid).val(v);
  }  
  $.ajax({
    type: 'POST',
    dataType: 'xml',
    url: '/admin/Forms/FrontEnd/ajax/form_trigger.asp',
    data: $('#ftrg_' + qid + ' *').serialize() + '&qid=' + qid
  }).success(function (xml) {
    var $status = $(xml).find("STATUS")
    if ($status.text() == 'show') {
      $('#flnk_' + qid).show();
    } 
  });
}

function formTriggerQuestionX(q, t, v) {  
  if (t == v) {
    $('#flnk_'+q).show();
  } else {
    $('#flnk_' + q).hide();
  }
  //console.log(q + ' ' + t + ' ' + v)
}

function formCheckboxValue(e, t, f) {
  if ($(e).is(':checked')) { return t; } else { return f; }
}

function getControlChecked(e) {
  var checked = [];
  var n = $(e).attr("name");
  $("input[name='" + n + "']:checked").each(function () {
    checked.push($(this).val());
  });
  if(Array.isArray(checked)) {
    return checked.join(', ');
  } else {
    return '';
  }  
}

function formSelectHelp(q, v) {
  $('.fhelp_' + q).hide();
  $('#fhelp_' + q + '_' + v).show();
}

//$form.find(':visible').serialize()
//data: $('.FormCapture').serialize() + '&doDB=' + doDB
//data: $('.FormCapture').find(':visible').serialize() + '&doDB=' + doDB
function formCapture(doDB, pid, data) {
  $("#FORM__formSubmit").prop("disabled", true).val('Saving...');
  var dataSig = '', doSig = '';
  var args = ((pid !== undefined) ? '&pid=' + pid : '') + ((data !== undefined) ? '&data=' + data : '');
  $('.formResponse').hide();
  $('.form_question_required').hide();
  if ($(".js-signature")[0]) {doSig = 'true'; if(!isCanvasBlank(document.getElementById('jq-signature-canvas-1'))) { dataSig = $('.js-signature').jqSignature('getDataURL'); } $('#formSignature').val(dataSig);}
  $.ajax({
    type: 'POST',
    dataType: 'xml',
    url: '/admin/Forms/FrontEnd/ajax/form_capture.asp',
    data: $('.FormCapture').find(':visible,:input[type=hidden],.g-recaptcha-response').serialize() + '&doDB=' + doDB + '&doSig=' + doSig + args
  }).success(function (xml) {
    if (args.length) { setFormSubmitButton(false); return false; }
      var $status = $(xml).find("STATUS"),$redirect = $(xml).find("REDIRECT"),$innerhtml = $(xml).find("INNERHTML"),$required = $(xml).find("REQUIRED");
    if ($status.text() == 'success' && doDB == 1 && $redirect.text() == 'True') {
      if (/\b(http|https)/.test($(xml).find("REDIRECTURL").text())) {
        window.location.replace($(xml).find("REDIRECTURL").text());
      } else {
        window.location.replace('//' + $(xml).find("REDIRECTURL").text());
      }
    } else {      
      $('.formResponse').show();
      $('.formResponse').html($innerhtml.text());
      $("div.formResponse").get(0).scrollIntoView({ behavior: 'smooth' });
      if ($status.text() == 'success' && doDB == 1) {
        $('.FormCapture').hide();
      } else {
        if ($required.length) {
          var rt = $required.text();
          var ra = rt.split(",");
          $.each(ra, function (i) {
            $('.form_question_required[data-id="' + ra[i] + '"]').show();
          });
        }
        $('.FormCapture').show();
      }
      if (doDB == 1) {
        $('html, body').animate({
          scrollTop: ($('.formResponse').offset().top)
        }, 500);
      }      
    }
  }).complete(function () {
    setFormSubmitButton(false);    
  });  
}

function setFormSubmitButton(isEnabled) {
  $("#FORM__formSubmit").prop("disabled", isEnabled).val($("#defaultSubmitLabel").val());
}

function isCanvasBlank(canvas) {
  const context = canvas.getContext('2d');
  const pixelBuffer = new Uint32Array(
    context.getImageData(0, 0, canvas.width, canvas.height).data.buffer
  );
  return !pixelBuffer.some(color => color !== 0);
}

function verifyBookingAccessCode(formID, bookingID, email, accessCode, formResponseID, ffn) {
  $.ajax({
    type: "GET",
    dataType: "html",
    async: false,
    url: "/admin/Forms/FrontEnd/ajax/booking/verify_access_code.asp?formID= " + formID + "&bookingID=" + bookingID + "&email=" + email + "&accessCode=" + accessCode + "&formResponseID=" + formResponseID + "&ffn=" + ffn
  }).done(function (resp) {
    $(".formResponse").hide();
    $("#formBookingResponse").html(resp);
    $("#formBookingResponse").show();
  });
}
