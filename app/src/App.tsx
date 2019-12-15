import React from 'react';
import { BrowserRouter, Route, Switch, Redirect } from 'react-router-dom';
import './App.css';
import { HomeView } from './views/HomeView/HomeView';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Switch>
        <Route path="/browse">
          <HomeView />
        </Route>
        <Route path="/settings">

        </Route>
        <Route path="/">
          <Redirect to="/browse" />
        </Route>
      </Switch>
    </BrowserRouter>
  );
}

export default App;
