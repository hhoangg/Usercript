const getAnswer = (endpoint) => {
  return new Promise((rs) => {
    $.ajax({
      url: endpoint,
      type: 'GET',
      dataType: 'jsonp',
      success: function (obj) {
        return rs(obj);
      },
    });
  });
};
(async function () {
  'use strict';
  const $basic_box = document.querySelector('#basic_box');
  let answers = [];
  const result = {
    total: 0,
    correct: 0,
  };
  const mappingAnswer = {
    a: 1,
    b: 2,
    c: 3,
    d: 4,
  };
  const onSubmit = () => {
    document.querySelectorAll('.toeic_select.toeic_q_select').forEach((question, index) => {
      result.total++;
      const $answer = question.querySelector('.toeic_explain');
      $answer.style.display = 'block';
      const answer = answers[index];
      const corrected = mappingAnswer[answer.explain[0].toLowerCase()] == question.getAttribute('value');
      if (corrected) {
        result.correct++;
        $answer.style.color = 'green';
      }
    });
    document.querySelector('.toeic_tbao_text').innerHTML = `Your point: ${result.correct}/${result.total}`;
  };

  if ($basic_box) {
    const endointAnswer = $basic_box.getAttribute('file_json');
    if (endointAnswer) {
      const rs = await getAnswer(endointAnswer);
      rs.segment.forEach((item) => {
        answers = answers.concat(item.list);
      });
    }
  }

  const observerConfig = {
    // attributes: true,
    childList: true,
    subtree: true,
  };

  const callback = function (mutationsList, observer) {
    for (let mutation of mutationsList) {
      if (mutation.type === 'childList') {
        if (mutation.target.className.includes('toeic_inx')) {
          document.querySelector('.toeic_button_sb').addEventListener('click', onSubmit);
        }
      }
    }
  };

  const observer = new MutationObserver(callback);

  observer.observe($basic_box, observerConfig);
})();
