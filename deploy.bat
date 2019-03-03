@ECHO off
IF "%1"=="all" (
  ECHO "PUSH MASTER"
  git push -v origin master:master
  ECHO "GIT STATUS"
  git status
  ECHO "CHECKOUT STAGING"
  git checkout staging
  ECHO "GIT STATUS"
  git status
  ECHO "MERGE MASTER INTO STAGING"
  git merge master
  ECHO "GIT STATUS"
  git status
  ECHO "PUSH STAGING"
  git push -v origin staging:staging
  ECHO "GIT STATUS"
  git status
  ECHO "CHECKOUT PROD"
  git checkout prod
  ECHO "GIT STATUS"
  git status
  ECHO "MERGE STAGING INTO PROD"
  git merge staging
  ECHO "GIT STATUS"
  git status
  ECHO "PUSH PROD"
  git push -v origin prod:prod
  ECHO "GIT STATUS"
  git status
  ECHO "CHECKOUT MASTER"
  git checkout master
  ECHO "GIT STATUS"
  git status
) ELSE ( 
  ECHO "PUSH MASTER"
  git push -v origin master:master
  ECHO "GIT STATUS"
  git status
)
