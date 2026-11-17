const routerScrollBehavior = (to, from, savedPosition) => {
  if (to.name === 'governance-id') {
    return { top: 0, left: 0 }
  }

  return savedPosition || { top: 0, left: 0 }
}

export default routerScrollBehavior
