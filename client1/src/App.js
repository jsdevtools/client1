import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';
import { Route, Link, Switch } from 'react-router-dom';

const About = () => (
  <span style={{background:'red'}}>About Content</span>
);

const Contact = () => (
  <span style={{background:'green'}}>Contact Content</span>
);

const Logout = () => (
  <div>
    <a
      className="App-link"
      style={{background:'purple'}}
      href="/logout"
      // target="_blank"
      //rel="noopener noreferrer"
    >Log Out</a>
  </div>
);

const DefaultContent = () => (
  <a
    className="App-link"
    href="https://reactjs.org"
    target="_blank"
    rel="noopener noreferrer"
  >
    Learn React
  </a>
);

class App extends Component {
  render() {
    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <p>
            Edit <code>src/App.js</code> and save to reload.
          </p>
          <nav>
            <Link to="/">Learn</Link>
            <Link to="/about">About</Link>
            <Link to="/contact">Contact</Link>
          </nav>
          <Switch>
            <Route path="/about" component={About} />
            <Route path="/contact" component={Contact} />
            <Route component={DefaultContent} />
          </Switch>
          <Logout />
        </header>
      </div>
    );
  }
}

export default App;
