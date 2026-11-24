from pydantic import BaseModel

try:
    import email_validator
    from pydantic import EmailStr
except (ImportError, Exception):
    EmailStr = str

class SignupSchema(BaseModel):
    name: str
    email: EmailStr
    password: str

class LoginSchema(BaseModel):
    email: EmailStr
    password: str
