# CodeGradXlib4node

work : lint tests
clean :
	-rm *~

# ############## Working rules:

lint :
	eslint codegradxlib4node.js

tests : lint test.with.real.servers test.with.vmauthor

refresh :
	rsync -avu ../CodeGradXlib/codegradxlib.js \
	  ./node_modules/codegradxlib/

test.with.real.servers : refresh
	jasmine spec/[0-8]*.js 2>&1 | tee /tmp/spec.log

test.with.vmauthor : spec/org.example.fw4ex.grading.check.tgz spec/oefgc.tgz
	@echo " tests require a running vmauthor..."
	ping -c 3 xvmauthor.codegradx.org
	export NODE_TLS_REJECT_UNAUTHORIZED=0 ;\
	jasmine spec/9*.js 2>&1 | tee -a /tmp/spec.log
	@echo "*** Report with         less /tmp/spec.log"

test.batch.with.real.servers : spec/org.example.fw4ex.grading.check.tgz
test.batch.with.real.servers : spec/oefgc.tgz
	jasmine spec/8*.js 2>&1 | tee /tmp/spec.log

spec/org.example.fw4ex.grading.check.tgz : spec/fw4ex.xml
	cd spec/ && tar czf org.example.fw4ex.grading.check.tgz ./fw4ex.xml

spec/oefgc.tgz : Makefile spec/oefgc/fw4ex.xml
	cd spec/oefgc/ && for d in 1 2 3 4 5 6 7 8 9 ; do \
		mkdir -p $$d && echo "$${d}0" > $$d/mark.txt ;\
	  tar czf $$d.tgz -C $$d mark.txt ; \
	done
	cd spec/oefgc/ && tar czf ../oefgc.tgz fw4ex.xml [0-9]*.tgz
	tar tzf spec/oefgc.tgz

# ############## NPM package
# Caution: npm takes the whole directory that is . and not the sole
# content of CodeGradXlib4node.tgz 

publish : lint clean
	git status .
	-git commit -m "NPM publication `date`" .
	git push
	-rm -f CodeGradXlib4node.tgz
	m CodeGradXlib4node.tgz install
	cd tmp/CodeGradXlib4node/ && npm version patch && npm publish
	cp -pf tmp/CodeGradXlib4node/package.json .
	rm -rf tmp
	npm install -g codegradxlib4node@`jq -r .version < package.json`
#	m propagate

CodeGradXlib4node.tgz :
	-rm -rf tmp
	mkdir -p tmp
	cd tmp/ && \
	  git clone https://github.com/ChristianQueinnec/CodeGradXlib4node.git
	rm -rf tmp/CodeGradXlib4node/.git
	cp -p package.json tmp/CodeGradXlib4node/ 
	tar czf CodeGradXlib4node.tgz -C tmp CodeGradXlib4node
	tar tzf CodeGradXlib4node.tgz

REMOTE	=	www.paracamplus.com
install :
	-rm CodeGradXlib4node.tgz
	m CodeGradXlib4node.tgz
	rsync -avu CodeGradXlib4node.tgz \
	  ${REMOTE}:/var/www/www.paracamplus.com/Resources/Javascript/

propagate :
	npm install -g codegradxlib4node@`jq -r .version < package.json`
	cd ../CodeGradXagent    ; m update
	cd ../CodeGradXvmauthor ; m update
	grep '"codegradxlib4node":' ../CodeGradX*/package.json

# end of Makefile
