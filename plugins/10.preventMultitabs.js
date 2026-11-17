function main() {
  const id = Date.now()
  window.id = id
  window.localStorage.setItem('firstTab', id)

  const onLocalStorageEvent = function (e) {
    // the second tab will write its id to this key. The first one will notice it
    if (e.key === 'firstTab') {
      const newID = Date.now()
      console.log('Another tab detected. Setting the new page id', newID)
      setTimeout(() => {
        window.localStorage.secondTab = newID // this is going to be a message for the second tab
      }, 200)
    }

    // the second tab proccesses the message
    if (e.key === 'secondTab' && window.id.toString() === window.localStorage.firstTab) {
      console.log('There is another tab that already opened')
      window.multipleTabsDetected = true
      // Historically this redirected to https://twitter.com/tornadocash (now x.com),
      // which looks like a browser hijack. Keep the warning, stay on the page.
      window.alert(
        'Another tab of this app is already open. Using multiple tabs may corrupt encrypted note data. Please close this tab and continue in the first one.'
      )
    }
  }

  // this event will only trigger when a window other than itself makes changes to local storage.
  setTimeout(() => {
    window.addEventListener('storage', onLocalStorageEvent, false)
  }, 100)
}

export default defineNuxtPlugin(() => {
  return {
    provide: {
      preventMultitabs: main
    }
  }
})
