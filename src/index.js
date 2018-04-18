import React from 'react'
import PropTypes from 'prop-types'
import { interpolate } from '../node_modules/react-spring/src/animated/AnimatedInterpolation'
import createAnimatedComponent from '../node_modules/react-spring/src/animated/createAnimatedComponent'
import AnimatedController from '../node_modules/react-spring/src/animated/AnimatedController'
import AnimatedValue from '../node_modules/react-spring/src/animated/AnimatedValue'
import AnimatedArray from '../node_modules/react-spring/src/animated/AnimatedArray'
import AnimatedProps from '../node_modules/react-spring/src/animated/AnimatedProps'
import SpringAnimation from '../node_modules/react-spring/src/animated/SpringAnimation'

export const config = {
  default: { tension: 170, friction: 26 },
  gentle: { tension: 120, friction: 14 },
  wobbly: { tension: 180, friction: 12 },
  stiff: { tension: 210, friction: 20 },
  slow: { tension: 280, friction: 60 },
}

class Spring extends React.PureComponent {
  static propTypes = {
    to: PropTypes.oneOfType([PropTypes.object, PropTypes.func]),
    from: PropTypes.object,
    config: PropTypes.object,
    native: PropTypes.bool,
    onRest: PropTypes.func,
    onFrame: PropTypes.func,
    children: PropTypes.oneOfType([
      PropTypes.func,
      PropTypes.arrayOf(PropTypes.func),
    ]),
    render: PropTypes.func,
    reset: PropTypes.bool,
    immediate: PropTypes.oneOfType([
      PropTypes.bool,
      PropTypes.arrayOf(PropTypes.string),
    ]),
    impl: PropTypes.func,
  }

  static defaultProps = {
    from: {},
    to: {},
    config: config.default,
    native: false,
    immediate: false,
    reset: false,
    impl: SpringAnimation,
  }

  state = { props: undefined }
  animations = {}

  componentWillUnmount() {
    this.stop()
  }

  componentWillMount() {
    this.updateProps(this.props)
  }

  componentWillReceiveProps(props) {
    this.updateProps(props)
  }

  updateProps(props, force = false) {
    const {
      impl,
      from,
      to,
      config,
      attach,
      immediate,
      reset,
      onFrame,
      onRest,
    } = props
    const allProps = Object.entries({ ...from, ...to })

    this.interpolators = {}
    this.animations = allProps.reduce((acc, [name, value], i) => {
      const entry =
        (reset === false && this.animations[name]) ||
        (this.animations[name] = {})

      let isNumber = typeof value === 'number'
      let isArray = !isNumber && Array.isArray(value)
      let fromValue = from[name] !== undefined ? from[name] : value
      let toValue = isNumber || isArray ? value : 1

      if (isNumber) {
        // Create animated value
        entry.animation = entry.interpolation =
          entry.animation || new AnimatedValue(fromValue)
      } else if (isArray) {
        // Create animated array
        entry.animation = entry.interpolation =
          entry.animation || new AnimatedArray(fromValue)
      }

      if (immediate && (immediate === true || immediate.indexOf(name) !== -1))
        entry.animation.setValue(toValue)

      entry.stopped = false
      entry.start = cb => {
        AnimatedController(entry.animation, { toValue, ...config }, impl).start(
          props => {
            if (props.finished) {
              this.animations[name].stopped = true
              if (
                Object.values(this.animations).every(
                  animation => animation.stopped
                )
              ) {
                const current = { ...this.props.from, ...this.props.to }
                onRest && onRest(current)
                cb && cb(current)
              }
            }
          }
        )
      }
      entry.stop = () => {
        entry.stopped = true
        entry.animation.stopAnimation()
      }

      this.interpolators[name] = entry.interpolation
      return { ...acc, [name]: entry }
    }, {})

    const oldAnimatedProps = this.animatedProps
    this.animatedProps = new AnimatedProps(this.interpolators, this.callback)
    oldAnimatedProps && oldAnimatedProps.__detach()

    this.start()
  }

  start() {
    return new Promise(res => this.getAnimations().forEach(a => a.start(res)))
  }

  stop() {
    this.getAnimations().forEach(a => a.stop())
  }

  callback = () => {
    if (this.props.onFrame) this.props.onFrame(this.animatedProps.__getValue())
    !this.props.native && this.forceUpdate()
  }

  getAnimations() {
    return Object.values(this.animations)
  }

  getValues() {
    return this.animatedProps ? this.animatedProps.__getValue() : {}
  }

  getAnimatedValues() {
    return this.props.native ? this.interpolators : this.getValues()
  }

  getForwardProps(props = this.props) {
    const {
      to,
      from,
      config,
      native,
      onRest,
      onFrame,
      children,
      render,
      reset,
      immediate,
      impl,
      ...forward
    } = props
    return forward
  }

  render() {
    const { children, render } = this.props
    const animatedProps = {
      ...this.getAnimatedValues(),
      ...this.getForwardProps(),
    }
    return render
      ? render({ ...animatedProps, children })
      : children(animatedProps)
  }
}

export { Spring, interpolate, createAnimatedComponent }
