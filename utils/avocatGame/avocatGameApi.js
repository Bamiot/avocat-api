const config = require('./config.json')

module.exports = {
  nextState: async function (state, actions) {
    const queue = actions
    const pit = state.pit
    const deck = state.deck
    const players = state.players
    const currentPlayer = state.currentPlayer
    let newState
    const validity = await this.checkValidity(queue, players, pit, deck, currentPlayer)

    switch (validity.status) {
      case 'init':
        newState = await this.init(players)
        break
      case 'draw':
        newState = await this.drawCard(queue, players, pit, deck)
        break
      case 'throw':
        const SAT_throw = await this.throwCard(queue, players, pit, deck)
        //check if the card throw in the pit has a passive effect
        newState = await this.passiveCardEffect(
          SAT_throw.queue,
          SAT_throw.state.players,
          SAT_throw.state.pit,
          SAT_throw.state.deck
        )

        break
      case 'swap':
        //SBT = State Before Throw
        const SBT_swap = await this.swapCard(queue, players, pit, deck)
        const SAT_swap = await this.throwCard(
          SBT_swap.queue,
          SBT_swap.state.players,
          SBT_swap.state.pit,
          SBT_swap.state.deck
        )
        //check if the card throw in the pit has a passive effect
        newState = await this.passiveCardEffect(
          SAT_swap.queue,
          SAT_swap.state.players,
          SAT_swap.state.pit,
          SAT_swap.state.deck
        )
        break
      case 'error':
        newState = validity
      default:
        break
    }
    return newState
  },
  checkValidity: async (queue, players, pit, deck, currentPlayer) => {
    return new Promise((resolve) => {
      switch (queue[0].type) {
        case 'init':
          return resolve({ status: 'init' })
        case 'draw':
          let playerToDraw
          players.forEach((playerFind) => {
            if (playerFind.username === queue[0].data.from) {
              playerToDraw = playerFind
            }
            if (playerFind.username !== queue[0].data.from && playerFind.hand !== '') {
              return resolve({
                status: 'error',
                error:
                  'An other player got a card in his hand and he is not the first in the action queue'
              })
            }
          })
          if (!playerToDraw)
            return resolve({
              status: 'error',
              error: 'Mismatch between currentPlayer and from in queue.data'
            })
          if (playerToDraw.hand !== '')
            return resolve({
              status: 'error',
              error: `the hand of the player isn't empty`
            })
          if (deck.length < 1)
            return resolve({
              status: 'error',
              error: 'the deck is empty the game is finish !'
            })
          else return resolve({ status: 'draw' })
        case 'throw':
          let playerToThrow
          players.forEach((playerFind) => {
            if (playerFind.username === queue[0].data.from) playerToThrow = playerFind
          })
          if (!playerToThrow)
            return resolve({
              status: 'error',
              error: 'Mismatch between currentPlayer and from in queue.data'
            })
          if (playerToThrow.hand === '')
            return resolve({
              status: 'error',
              error: `the hand of the player isn't empty`
            })
          if (deck.length < 1)
            return resolve({
              status: 'error',
              error: 'the deck is empty the game is finish !'
            })
          else return resolve({ status: 'throwCard' })
        case 'swap':
          let playerFromSwap
          let playerToSwap
          players.forEach((playerFind) => {
            if (playerFind.username === queue[0].data.from.owner) {
              playerFromSwap = playerFind
            }
            if (playerFind.username === queue[0].data.to.owner) {
              playerToSwap = playerFind
            }
          })
          if (!playerFromSwap || !playerToSwap) {
            return resolve({
              status: 'error',
              error: 'player from swap or player to swap are not found !'
            })
          }
          if (playerFromSwap.username === playerToSwap.username) {
            if (
              JSON.stringify(playerFromSwap.hand) !==
                JSON.stringify(queue[0].data.from) ||
              !JSON.stringify(playerFromSwap.cards).includes(
                JSON.stringify(queue[0].data.to)
              )
            ) {
              return resolve({
                status: 'error',
                error: `wrong card to swap in the hand or deck of ${playerFromSwap.username}`
              })
            }
          } else {
            if (
              !JSON.stringify(playerFromSwap.cards).includes(
                JSON.stringify(queue[0].data.from)
              )
            ) {
              return resolve({
                status: 'error',
                error: `the cards from the swap isn't in the deck of ${playerFromSwap.username}`
              })
            }
            if (
              !JSON.stringify(playerToSwap.cards).includes(
                JSON.stringify(queue[0].data.to)
              )
            ) {
              return resolve({
                status: 'error',
                error: `the cards to the swap isn't in the deck of ${playerToSwap.username}`
              })
            }
          }
          return resolve({ status: 'swap' })
        default:
          break
      }
    })
  },
  newDeck: async function () {
    return new Promise((resolve) => {
      let returnCards = []
      let sortedDeck = []
      for (let i = 0; i < config.CARDS.length; i++) {
        for (let j = 0; j < config.COLORS.length; j++) {
          sortedDeck.push({ id: `${config.CARDS[i]}${config.COLORS[j]}` })
        }
      }
      do {
        const card = sortedDeck.splice(
          Math.round(Math.random() * sortedDeck.length - 1),
          1
        )
        returnCards.push(card[0])
      } while (sortedDeck.length >= 1)
      return resolve(returnCards)
    })
  },
  init: function (players) {
    return new Promise(async (resolve) => {
      //instanciate deck
      let deck = await this.newDeck()
      // set this pit to an empty array
      let pit = []
      // give four cards for each player
      let queue = []

      for (let index = 0; index < players.length; index++) {
        queue.push({
          howMany: 1,
          type: 'draw',
          data: { from: players[index].username }
        })
      }

      for (let index = 0; index < players.length; index++) {
        let player = players[index]
        let cardsOfPlayer = []
        for (let index = 0; index <= 3; index++) {
          const card = {
            id: deck.shift().id,
            owner: player.username,
            isReveal: true
          }
          cardsOfPlayer.push(card)
        }
        player.cards = cardsOfPlayer
      }
      const state = { deck, pit, players }
      return resolve({ state, queue })
    })
  },
  drawCard: async function (queue, players, pit, deck) {
    return new Promise((resolve) => {
      players.forEach((player, i) => {
        if (player.username === queue[0].data.from) {
          player.hand = {
            id: deck.shift().id,
            owner: player.username,
            isReveal: true
          }
          queue.push({
            howMany: 1,
            type: 'draw',
            data: { from: players[i].username }
          })
        }
      })
      queue.shift()
      const state = { players, deck, pit }
      return resolve({ state, queue })
    })
  },
  throwCard: async (queue, players, pit, deck) => {
    return new Promise((resolve) => {
      players.forEach(async (player) => {
        if (player.username === queue[0].data.from) {
          const card = player.hand
          pit = [...pit, card]
          player.hand = ''
        }
      })
      queue.shift()
      const state = { players, deck, pit }
      return resolve({ state, queue })
    })
  },
  swapCard: async (queue, players, pit, deck) => {
    return new Promise((resolve) => {
      let playerFromSwap
      let playerToSwap
      players.forEach((playerFind, i) => {
        if (playerFind.username === queue[0].data.from.owner) {
          playerFromSwap = i
        }
        if (playerFind.username === queue[0].data.to.owner) {
          playerToSwap = i
        }
      })
      if (players[playerFromSwap].username === players[playerToSwap].username) {
        let cardBuffer = queue[0].data.from
        players[playerFromSwap].hand = queue[0].data.to
        for (let index = 0; index < players[playerFromSwap].cards.length; index++) {
          if (
            JSON.stringify(queue[0].data.to) ===
            JSON.stringify(players[playerFromSwap].cards[index])
          ) {
            players[playerFromSwap].cards[index] = cardBuffer
          }
        }
        queue.shift()
        queue.unshift({
          howMany: 1,
          type: 'throwCard',
          data: { from: players[playerFromSwap].username }
        })
        const state = { players, deck, pit }
        return resolve({ state, queue })
      } else {
        for (let index = 0; index < players[playerFromSwap].cards.length; index++) {
          if (
            JSON.stringify(queue.data.from) ===
            JSON.stringify(players[playerFromSwap].cards[index])
          ) {
            players[playerFromSwap].cards[index] = queue.data.to
          }
        }
        for (let index = 0; index < players[playerToSwap].cards.length; index++) {
          if (
            JSON.stringify(queue[0].data.to) ===
            JSON.stringify(players[playerToSwap].cards[index])
          ) {
            players[playerToSwap].cards[index] = queue[0].data.from
          }
        }
        queue.shift()
        const state = { players, deck, pit }
        return resolve({ state, queue })
      }
    })
  },
  passiveCardEffect: async (queue, players, pit, deck) => {
    return new Promise((resolve) => {
      const tenCardList = ['10H', '10D', '10S', '10C']
      const heightCardList = ['8H', '8D', '8S', '8C']
      const { id, owner } = pit[pit.length - 1]
      if (tenCardList.includes(id)) {
        queue.unshift({
          howMany: 1,
          type: 'draw',
          data: { from: owner }
        })
      }
      if (heightCardList.includes(id)) {
        queue.forEach((action, i) => {
          if (action.username !== owner && action.type === 'draw') {
            queue.splice(i, 1)
            queue.push(action)
          }
        })
      }
      const state = { players, pit, deck }
      return resolve({ state, queue })
    })
  }
}
