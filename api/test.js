import bcrypt from 'bcryptjs';

bcrypt.hash('1234567lzp', 10).then((hash) => {
  console.log(hash);
});
