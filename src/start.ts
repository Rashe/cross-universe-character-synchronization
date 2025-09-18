import App from './app';

const port = process.env.PORT || 3600;
const appInstance = new App();

appInstance.app.listen(port, () => {
  console.log(`Server is running at port ${ port }`);
});

