const $logoutButton = $('#logout');
const $boardContainer = $('.container');
const $boardName = $('header > h1');
const $createListInput = $('#create-list input');
const $saveListButton = $('#create-list .save');
const $createCardInput = $('#create-card textarea');
const $saveCardButton = $('#create-card .save');
const $editListInput = $('#edit-list input');
const $editListSaveButton = $('#edit-list .save');
const $editListDeleteButton = $('#edit-list .delete');
const $editCardInput = $('#edit-card input');
const $editCardSaveButton = $('#edit-card .save');
const $editCardDeleteButton = $('#edit-card .delete');
const $contributorModalButton = $('#contributors');
const $contributorModalInput = $('#contributor-email');
const $contributorModalSaveButton = $('#contribute .save');
const $contributorModalList = $('#contributors-content ul');

let board;

init();

function init() {
  let boardID = location.pathname.split('/')[2];
  getBoard(boardID);
}

function getBoard(id) {
  $.ajax({
    url: `/api/boards/${id}`,
    method: 'GET'
  }).then(function(data) {
    board = data;
    renderBoard();
  }).catch(function(err) {
    location.replace('/boards');
  });
}

function handleLogout() {
  $.ajax({
    url: '/logout',
    method: 'DELETE'
  }).then(function() {
    localStorage.clear();
    location.replace('/');
  });
}

function createLists(lists) {
  let $listContainers = lists.map(function(list) {
    let $listContainer = $('<div class="list">').data(list);
    let $header = $('<header>');
    let $headerButton = $('<button>')
      .text(list.title)
      .data(list)
      .on('click', openListEditModal);
    let $addCardButton = $('<button>Add a card...</button>')
      .on('click', openCardCreateModal);
    let $cardUl = createCards(list.cards);

    $header.append($headerButton);
    $listContainer.append($header);
    $listContainer.append($cardUl);
    $listContainer.append($addCardButton);

    return $listContainer;
  });

  let $addListContainer = $('<div class="list add">');
  let $addListButton = $('<button>')
    .text('+ Add another list')
    .on('click', openListCreateModal);

  $addListContainer.append($addListButton);
  $listContainers.push($addListContainer);

  return $listContainers;
}

function createCards(cards) {
  let $cardUl = $('<ul>');

  let $cardLis = cards.map(function(card) {
    let $card = $('<li>');
    let $cardButton = $('<button>')
      .text(card.text)
      .data(card)
      .on('click', openCardEditModal);

    $card.append($cardButton);
    return $card;
  });

  $cardUl.append($cardLis);

  return $cardUl;
}

function renderBoard() {
  let $lists = createLists(board.lists);

  $boardName.text(board.name);

  $boardContainer.empty();
  $boardContainer.append($lists);

  makeSortable();
  renderContributors();
}

function renderContributors() {
  let $contributorListItems = board.users.map(function(user) {
    let $contributorListItem = $('<li>');
    let $contributorSpan = $('<span>').text(user.email);
    let $contributorDeleteButton = $(
      '<button class="danger">Remove</button>'
    ).data(user).on('click', handleContributorDelete);

    $contributorListItem.append($contributorSpan, $contributorDeleteButton);

    return $contributorListItem;
  });

  $contributorModalList.empty();
  $contributorModalList.append($contributorListItems);
}

function makeSortable() {
  Sortable.create($boardContainer[0], {
    animation: 400,
    easing: 'cubic-bezier(0.785, 0.135, 0.15, 0.86)',
    swapThreshold: 0.85,
    filter: '.add',
    ghostClass: 'ghost',
    onMove: function(event) {
      let shouldMove = !$(event.related).hasClass('add');
      return shouldMove;
    },
    onEnd: function(event) {
      let { id, position } = $(event.item).data();
      let newPosition = event.newIndex + 1;

      if (position === newPosition) {
        return;
      }

      $.ajax({
        url: `/api/lists/${id}`,
        method: 'PUT',
        data: {
          position: newPosition
        }
      }).then(function() {
        init();
      });
    }
  });

  $('.list > ul').each(function(index, element) {
    Sortable.create(element, {
      group: 'cards',
      ghostClass: 'ghost',
      animation: 200,
      easing: 'cubic-bezier(0.785, 0.135, 0.15, 0.86)',
      onEnd: function(event) {
        let oldList = $(event.from).parent().data().id;
        let newList = $(event.to).parent().data().id;
        let { id, position } = $(event.item.childNodes[0]).data();
        let newPosition = event.newIndex + 1;

        if (newPosition === position && newList === oldList) {
          return;
        }

        $.ajax({
          url: `/api/cards/${id}`,
          method: 'PUT',
          data: {
            position: newPosition,
            list_id: newList
          }
        }).then(function() {
          init();
        });
      }
    });
  });
}

function openListCreateModal() {
  $createListInput.val('');
  MicroModal.show('create-list');
}

function openCardCreateModal(event) {
  let listID = $(event.target).parents('.list').data('id');

  $saveCardButton.data('id', listID);

  $createCardInput.val('');
  MicroModal.show('create-card');
}

function handleListCreate(event) {
  event.preventDefault();

  let listTitle = $createListInput.val().trim();

  if (!listTitle) {
    MicroModal.close('create-list');
    return;
  }

  $.ajax({
    url: '/api/lists',
    method: 'POST',
    data: {
      board_id: board.id,
      title: listTitle
    }
  }).then(function() {
    init();
    MicroModal.close('create-list');
  });
}

function handleCardCreate(event) {
  event.preventDefault();

  let cardText = $createCardInput.val().trim();
  let listID = $(event.target).data('id');

  if (!cardText) {
    MicroModal.close('create-card');
    return;
  }

  $.ajax({
    url: '/api/cards',
    method: 'POST',
    data: {
      list_id: listID,
      text: cardText
    }
  }).then(function(data) {
    init();
    MicroModal.close('create-card');
  });
}

function openListEditModal(event) {
  let listData = $(event.target).data();

  $editListInput.val(listData.title);
  $editListSaveButton.data(listData);
  $editListDeleteButton.data(listData);

  MicroModal.show('edit-list');
}

function handleListEdit(event) {
  event.preventDefault();

  let { title, id } = $(event.target).data();
  let newTitle = $editListInput.val().trim();

  if (!newTitle || newTitle === title) {
    MicroModal.close('edit-list');
    return;
  }

  $.ajax({
    url: `/api/lists/${id}`,
    method: 'PUT',
    data: {
      title: newTitle
    }
  }).then(function() {
    init();
    MicroModal.close('edit-list');
  });
}

function handleListDelete(event) {
  event.preventDefault();

  let { id } = $(event.target).data();

  $.ajax({
    url: `/api/lists/${id}`,
    method: 'DELETE'
  }).then(function() {
    init();
    MicroModal.close('edit-list');
  });
}

function openCardEditModal(event) {
  let cardData = $(event.target).data();

  $editCardInput.val(cardData.text);
  $editCardSaveButton.data(cardData);
  $editCardDeleteButton.data(cardData);

  MicroModal.show('edit-card');
}

function handleCardEdit(event) {
  event.preventDefault();

  let { text, id } = $(event.target).data();
  let newText = $editCardInput.val().trim();

  if (!newText || newText === text) {
    MicroModal.close('edit-card');
    return;
  }

  $.ajax({
    url: `/api/cards/${id}`,
    method: 'PUT',
    data: {
      text: newText
    }
  }).then(function() {
    init();
    MicroModal.close('edit-card');
  });
}

function handleCardDelete(event) {
  event.preventDefault();

  let { id } = $(event.target).data();

  $.ajax({
    url: `/api/cards/${id}`,
    method: 'DELETE'
  }).then(function() {
    init();
    MicroModal.close('edit-card');
  });
}

function openContributorModal() {
  $contributorModalInput.val('');
  displayMessage('');

  MicroModal.show('contribute');
}

function handleContributorSave(event) {
  event.preventDefault();

  let emailRegex = /.+@.+\..+/;

  let contributorEmail = $contributorModalInput.val().trim().toLowerCase();

  $contributorModalInput.val('');

  if (!emailRegex.test(contributorEmail)) {
    displayMessage('Must provide a valid email address', 'danger');
    return;
  }

  let contributor = board.users.find(function(user) {
    return user.email === contributorEmail;
  });

  if (contributor) {
    displayMessage(
      `${contributorEmail} already has access to the board`,
      'danger'
    );
    return;
  }

  $.ajax({
    url: '/api/user_boards',
    method: 'POST',
    data: {
      email: contributorEmail,
      board_id: board.id
    }
  }).then(function() {
    init();
    displayMessage(
      `Successfully added ${contributorEmail} to the board`,
      'success'
    );
  }).catch(function() {
    displayMessage(
      `Cannot find user with email: ${contributorEmail}`,
      'danger'
    );
  });
}

function displayMessage(msg, type = 'hidden') {
  $('#contribute .message').attr('class', `message ${type}`).text(msg);
}

function handleContributorDelete(event) {
  console.log($(event.target).data());
  let { id, email } = $(event.target).data();

  $.ajax({
    url: '/api/user_boards',
    method: 'DELETE',
    data: {
      user_id: id,
      board_id: board.id
    }
  }).then(function() {
    init();
    displayMessage(
      `Successfully removed ${email} from the board`,
      'success'
    ).catch(function(err) {
      if (err.statusText === 'Unauthorized') {
        location.replace('/boards');
      }
    });
  });
}

$contributorModalSaveButton.on('click', handleContributorSave);
$contributorModalButton.on('click', openContributorModal);
$saveCardButton.on('click', handleCardCreate);
$saveListButton.on('click', handleListCreate);
$logoutButton.on('click', handleLogout);
$editListSaveButton.on('click', handleListEdit);
$editListDeleteButton.on('click', handleListDelete);
$editCardSaveButton.on('click', handleCardEdit);
$editCardDeleteButton.on('click', handleCardDelete);