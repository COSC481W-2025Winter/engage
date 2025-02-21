interface FormValues {
  usernameOrEmail: string;
  password: string;
}

interface FormErrors {
  usernameOrEmail?: string;
  password?: string;
}

const validation = (values: FormValues): FormErrors => {
  const errors: FormErrors = {};

  const passwordPattern = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).{8,}$/;

  if (!values.usernameOrEmail) {
    errors.usernameOrEmail = "Username or email is required";
  }

  if (!values.password) {
    errors.password = "Password is required";
  } else if (!passwordPattern.test(values.password)) {
    errors.password = "Password is invalid";
  }

  return errors;
};

export default validation;
