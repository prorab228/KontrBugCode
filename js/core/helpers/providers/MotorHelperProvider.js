class MotorHelperProvider extends BaseHelperProvider {
    constructor() {
        super();

        this.helperMap = {
            'motor_dc': this.generateDCMotorHelper,
            'controlbug_motors': this.generateControlBugMotorsHelper,
            'motor_stepper': this.generateStepperHelper,
            'l298n_begin': this.generateL298NHelper,
            'l298n_dual_begin': this.generateL298NDualHelper
        };
    }

    generateDCMotorHelper = () => {
        return `
void setDCMotor(int pin1, int pin2, int speed) {
  speed = constrain(speed, -255, 255);
  pinMode(pin1, OUTPUT);
  pinMode(pin2, OUTPUT);

  if (speed > 0) {
    analogWrite(pin1, speed);
    digitalWrite(pin2, LOW);
  } else if (speed < 0) {
    digitalWrite(pin1, LOW);
    analogWrite(pin2, -speed);
  } else {
    digitalWrite(pin1, LOW);
    digitalWrite(pin2, LOW);
  }
}
`;
    }

    generateControlBugMotorsHelper = () => {
        return `
void setControlBugMotors(int leftSpeed, int rightSpeed) {
  leftSpeed = constrain(leftSpeed, -255, 255);
  rightSpeed = constrain(rightSpeed, -255, 255);

  pinMode(11, OUTPUT);
  pinMode(10, OUTPUT);
  pinMode(3, OUTPUT);
  pinMode(9, OUTPUT);

  // Левый мотор
  if (leftSpeed > 0) {
    analogWrite(11, leftSpeed);
    digitalWrite(10, LOW);
  } else if (leftSpeed < 0) {
    digitalWrite(11, LOW);
    analogWrite(10, -leftSpeed);
  } else {
    digitalWrite(11, LOW);
    digitalWrite(10, LOW);
  }

  // Правый мотор
  if (rightSpeed > 0) {
    analogWrite(3, rightSpeed);
    digitalWrite(9, LOW);
  } else if (rightSpeed < 0) {
    digitalWrite(3, LOW);
    analogWrite(9, -rightSpeed);
  } else {
    digitalWrite(3, LOW);
    digitalWrite(9, LOW);
  }
}
`;
    }

    generateStepperHelper = () => {
        return `
void stepMotor(int pin1, int pin2, int pin3, int pin4, int steps) {
  int pins[4] = {pin1, pin2, pin3, pin4};
  int steps_seq[4][4] = {
    {1, 0, 0, 1},
    {1, 1, 0, 0},
    {0, 1, 1, 0},
    {0, 0, 1, 1}
  };

  int direction = (steps > 0) ? 1 : -1;
  steps = abs(steps);

  for(int i = 0; i < steps; i++) {
    int step = (direction > 0) ? i % 4 : (4 - (i % 4)) % 4;
    for(int pin = 0; pin < 4; pin++) {
      digitalWrite(pins[pin], steps_seq[step][pin]);
    }
    delay(10);
  }

  for(int pin = 0; pin < 4; pin++) {
    digitalWrite(pins[pin], LOW);
  }
}
`;
    }

    generateL298NHelper = () => {
        return `
// L298N single motor helper
int L298N_IN1, L298N_IN2, L298N_ENA;

void setL298NMotor(int speed) {
  speed = constrain(speed, -255, 255);

  if (speed > 0) {
    digitalWrite(L298N_IN1, HIGH);
    digitalWrite(L298N_IN2, LOW);
    analogWrite(L298N_ENA, speed);
  } else if (speed < 0) {
    digitalWrite(L298N_IN1, LOW);
    digitalWrite(L298N_IN2, HIGH);
    analogWrite(L298N_ENA, -speed);
  } else {
    digitalWrite(L298N_IN1, LOW);
    digitalWrite(L298N_IN2, LOW);
    analogWrite(L298N_ENA, 0);
  }
}
`;
    }

    generateL298NDualHelper = () => {
        return `
// L298N dual motors helper
int L298N_IN1, L298N_IN2, L298N_ENA;
int L298N_IN3, L298N_IN4, L298N_ENB;

void setL298NDualMotors(int motorA, int motorB) {
  motorA = constrain(motorA, -255, 255);
  motorB = constrain(motorB, -255, 255);

  // Motor A
  if (motorA > 0) {
    digitalWrite(L298N_IN1, HIGH);
    digitalWrite(L298N_IN2, LOW);
    analogWrite(L298N_ENA, motorA);
  } else if (motorA < 0) {
    digitalWrite(L298N_IN1, LOW);
    digitalWrite(L298N_IN2, HIGH);
    analogWrite(L298N_ENA, -motorA);
  } else {
    digitalWrite(L298N_IN1, LOW);
    digitalWrite(L298N_IN2, LOW);
    analogWrite(L298N_ENA, 0);
  }

  // Motor B
  if (motorB > 0) {
    digitalWrite(L298N_IN3, HIGH);
    digitalWrite(L298N_IN4, LOW);
    analogWrite(L298N_ENB, motorB);
  } else if (motorB < 0) {
    digitalWrite(L298N_IN3, LOW);
    digitalWrite(L298N_IN4, HIGH);
    analogWrite(L298N_ENB, -motorB);
  } else {
    digitalWrite(L298N_IN3, LOW);
    digitalWrite(L298N_IN4, LOW);
    analogWrite(L298N_ENB, 0);
  }
}
`;
    }
}